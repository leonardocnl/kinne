"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import type { AccountView } from "@/application/accounts";
import {
    hasSkippedStep,
    nextOnboardingStep,
    onboardingPercent,
    onboardingPrefill,
    ONBOARDING_STEPS,
} from "@/domain/accounts";
import { parseSearchTerm, type SearchResult } from "@/domain/search";
import { STREAMING_SERVICES, type Streaming } from "@/domain/streaming";
import { saveOnboardingStep } from "../../_actions/account";
import { onboardingTitles } from "../../_actions/onboarding";
import { searchTitles } from "../../_actions/search";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { cx } from "../ui/cx";
import { TextLink } from "../ui/TextLink";
import { TmdbImage } from "../ui/TmdbImage";
import { posterSources } from "../ui/tmdb-sources";
import { GENERIC_ERROR } from "./messages";
import { loadAccountStatus, useAccountStatus } from "./store";

type Tile = { slug: string; title: string; year: number | null; poster: string | null };

const STEP_LIMIT = 3;

// O primeiro passo ainda sem resposta; se todos foram respondidos, o primeiro que foi pulado (o
// perfil leva até aqui com "Complete seu gosto", US013 C4). Null: nada a fazer.
function startStep(account: AccountView): 1 | 2 | 3 | null {
    const next = nextOnboardingStep(account.onboarding);
    if (next) return next;
    return hasSkippedStep(account.onboarding)
        ? (([1, 2, 3] as const).find((s) => account.onboarding[s] === "skipped") ?? null)
        : null;
}

/** Onboarding (US013): três passos, puláveis, já preenchidos com o que o navegador tinha. */
export function Onboarding() {
    const router = useRouter();
    const status = useAccountStatus();
    useEffect(() => {
        if (status.state === "visitor") router.replace("/entrar");
    }, [status.state, router]);
    if (status.state !== "account") {
        return (
            <main aria-busy="true" className="min-h-60">
                <p role="status" className="text-data text-soft">
                    Carregando…
                </p>
            </main>
        );
    }
    return <Steps account={status.account} />;
}

function Steps({ account }: { account: AccountView }) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3 | null>(() => startStep(account));
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const percent = onboardingPercent(account.onboarding);

    useEffect(() => {
        // tudo respondido e nada pulado: não há o que fazer aqui (C6)
        if (step === null) router.replace("/");
    }, [step, router]);

    async function finish(status: "done" | "skipped", slugs: string[], streamings: Streaming[]) {
        if (busy || step === null) return;
        setBusy(true);
        setError(null);
        try {
            const answer = await saveOnboardingStep({ step, status, slugs, streamings });
            if (!answer.ok) {
                setError(GENERIC_ERROR);
                setBusy(false);
                return;
            }
            const refreshed = await loadAccountStatus(true);
            const progress = refreshed.state === "account" ? refreshed.account.onboarding : {};
            // o próximo sem resposta; depois do último, a tela inicial (C6)
            const next = nextOnboardingStep(progress);
            if (next) setStep(next);
            else router.replace("/");
        } catch {
            setError(GENERIC_ERROR);
        }
        setBusy(false);
    }

    if (step === null) return null;
    const meta = ONBOARDING_STEPS[step - 1];
    const prefill = onboardingPrefill(step, {
        signals: {
            liked: account.liked.map((t) => t.titleId),
            willWatch: [],
            disliked: account.disliked.map((t) => t.titleId),
        },
        streamings: account.streamings,
    });

    return (
        <main className="flex flex-col gap-6 pt-2 desktop:pt-3.5">
            <div className="flex flex-col gap-2">
                <div
                    role="progressbar"
                    aria-label="Onboarding"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1.5 w-full max-w-measure overflow-hidden rounded-pill bg-line"
                >
                    <div className="h-full bg-paper" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-data text-soft">
                    Passo {step} de 3 · {percent}% concluído
                </p>
            </div>
            <h1 className="pb-1 font-display text-title font-medium text-balance">{meta.title}</h1>

            {step === 3 ? (
                <StreamingsStep
                    key={step}
                    initial={prefill.streamings}
                    busy={busy}
                    onDone={(streamings) => finish("done", [], streamings)}
                    onSkip={() => finish("skipped", [], [])}
                />
            ) : (
                <TitlesStep
                    key={step}
                    account={account}
                    step={step}
                    prefillIds={prefill.titleIds}
                    busy={busy}
                    onDone={(slugs) => finish("done", slugs, [])}
                    onSkip={() => finish("skipped", [], [])}
                />
            )}
            {error && (
                <p role="alert" className="text-data text-soft">
                    {error}
                </p>
            )}
        </main>
    );
}

function TitlesStep({
    account,
    step,
    prefillIds,
    busy,
    onDone,
    onSkip,
}: {
    account: AccountView;
    step: 1 | 2;
    prefillIds: number[];
    busy: boolean;
    onDone: (slugs: string[]) => void;
    onSkip: () => void;
}) {
    const searchId = useId();
    // o que o passo já traz do navegador, agora na conta (C3): os mais recentes, até 3
    const known = useMemo(() => {
        const list = step === 1 ? account.liked : account.disliked;
        return list.filter((t) => prefillIds.includes(t.titleId));
    }, [account, step, prefillIds]);
    const [picked, setPicked] = useState<Tile[]>(known);
    const [grid, setGrid] = useState<Tile[]>([]);
    const [term, setTerm] = useState("");
    const [found, setFound] = useState<Tile[] | null>(null);
    const [searchNote, setSearchNote] = useState<string | null>(null);
    const prefilledComplete = known.length === STEP_LIMIT;

    useEffect(() => {
        let live = true;
        void onboardingTitles().then((titles) => live && setGrid(titles));
        return () => {
            live = false;
        };
    }, []);

    // um título marcado no outro passo não aparece neste (C2)
    const otherStep = new Set((step === 1 ? account.disliked : account.liked).map((t) => t.slug));
    const visible = (list: Tile[]) => list.filter((t) => !otherStep.has(t.slug));

    const toggle = (tile: Tile) =>
        setPicked((current) =>
            current.some((t) => t.slug === tile.slug)
                ? current.filter((t) => t.slug !== tile.slug)
                : current.length < STEP_LIMIT
                  ? [...current, tile]
                  : current,
        );

    async function search() {
        if (!parseSearchTerm(term)) {
            setSearchNote("Digite pelo menos 2 letras.");
            return;
        }
        setSearchNote(null);
        try {
            const outcome = await searchTitles({ term });
            if (outcome.kind === "results") {
                setFound(
                    outcome.results.map((r: SearchResult) => ({
                        slug: r.slug,
                        title: r.title,
                        year: r.year,
                        poster: r.posterPath,
                    })),
                );
            } else {
                setFound([]);
                setSearchNote(
                    outcome.kind === "unavailable"
                        ? "Não conseguimos buscar agora. Tente de novo em instantes."
                        : "Nenhum título encontrado.",
                );
            }
        } catch {
            setSearchNote("Não conseguimos buscar agora. Tente de novo em instantes.");
        }
    }

    const shown = visible(found ?? grid);

    return (
        <>
            <p className="text-data text-soft" role="status">
                {picked.length} de {STEP_LIMIT} escolhidos
            </p>
            <form
                className="flex max-w-measure gap-2.5"
                onSubmit={(event) => {
                    event.preventDefault();
                    void search();
                }}
            >
                <label htmlFor={searchId} className="sr-only">
                    Buscar um título
                </label>
                <input
                    id={searchId}
                    type="search"
                    value={term}
                    onChange={(event) => {
                        setTerm(event.target.value);
                        if (event.target.value === "") setFound(null);
                    }}
                    autoComplete="off"
                    maxLength={80}
                    placeholder="Buscar um título"
                    className="h-control min-w-0 flex-1 rounded-pill border border-line bg-scrim-strong px-5 text-small text-paper placeholder:text-soft"
                />
                <Button type="submit" variant="quiet">
                    Buscar
                </Button>
            </form>
            {searchNote && (
                <p role="status" className="text-data text-soft">
                    {searchNote}
                </p>
            )}

            <ul className="grid grid-cols-3 gap-3 desktop:grid-cols-6">
                {[...picked, ...shown.filter((t) => !picked.some((p) => p.slug === t.slug))].map(
                    (tile) => {
                        const on = picked.some((t) => t.slug === tile.slug);
                        return (
                            <li key={tile.slug}>
                                <button
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggle(tile)}
                                    className={cx(
                                        "flex w-full cursor-pointer flex-col gap-1.5 border p-1 text-left transition-colors duration-hover motion-reduce:transition-none",
                                        on ? "border-paper bg-hover" : "border-line",
                                    )}
                                >
                                    {tile.poster ? (
                                        <TmdbImage
                                            sources={posterSources(tile.poster)}
                                            className="aspect-2/3 w-full"
                                        />
                                    ) : (
                                        <span
                                            className="aspect-2/3 w-full bg-frame"
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span className="text-caption text-soft">{tile.title}</span>
                                    {on && <span className="sr-only">(escolhido)</span>}
                                </button>
                            </li>
                        );
                    },
                )}
            </ul>

            <div className="flex flex-wrap items-center gap-2.5">
                <Button
                    variant="primary"
                    disabled={busy || picked.length !== STEP_LIMIT}
                    aria-busy={busy}
                    onClick={() => onDone(picked.map((t) => t.slug))}
                    className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                >
                    {prefilledComplete && sameSlugs(picked, known) ? "Confirmar" : "Continuar"}
                </Button>
                <TextLink onClick={onSkip}>Pular por agora</TextLink>
            </div>
        </>
    );
}

const sameSlugs = (a: Tile[], b: { slug: string }[]) =>
    a.length === b.length && a.every((t) => b.some((x) => x.slug === t.slug));

function StreamingsStep({
    initial,
    busy,
    onDone,
    onSkip,
}: {
    initial: Streaming[];
    busy: boolean;
    onDone: (streamings: Streaming[]) => void;
    onSkip: () => void;
}) {
    const id = useId();
    const [picked, setPicked] = useState<Streaming[]>(initial);
    return (
        <>
            <span id={`${id}-label`} className="text-data text-soft">
                Marque os que você assina. Sem nenhum, o Kinne mostra todos.
            </span>
            <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-1.5">
                {STREAMING_SERVICES.map((s) => {
                    const on = picked.includes(s.id);
                    return (
                        <Chip
                            key={s.id}
                            pressed={on}
                            onClick={() =>
                                setPicked(on ? picked.filter((x) => x !== s.id) : [...picked, s.id])
                            }
                        >
                            {s.name}
                        </Chip>
                    );
                })}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
                <Button
                    variant="primary"
                    disabled={busy}
                    aria-busy={busy}
                    onClick={() => onDone(picked)}
                    className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                >
                    {initial.length > 0 && picked.join() === initial.join()
                        ? "Confirmar"
                        : "Continuar"}
                </Button>
                <TextLink onClick={onSkip}>Pular por agora</TextLink>
            </div>
        </>
    );
}
