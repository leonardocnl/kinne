"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, useTransition } from "react";
import { MIN_RATING } from "@/domain/catalog";
import {
    matchTitles,
    MAX_RATING,
    RUNTIME_LIMITS,
    wireFilters,
    withType,
    type FilterCandidate,
    type Filters,
    type TypeChoice,
} from "@/domain/filters";
import { FEELING_LABELS, FEELINGS } from "@/domain/feelings";
import { GENRE_LABELS, KINNE_GENRES } from "@/domain/genre";
import { STREAMING_SERVICES } from "@/domain/streaming";
import { EMPTY_TASTE } from "@/domain/taste-signals";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import {
    filteredRun,
    saveFilters,
    savedFilters,
    tasteSignals,
    watchedTitles,
} from "@/infrastructure/browser-storage";
import { drawFiltered, filterCandidates } from "../../_actions/filters";
import { personTitles } from "../../_actions/people";
import { loadError } from "../StateScreen";
import { saveStreamings } from "../../_actions/account";
import { rememberReturn } from "../account/returnTo";
import { setAccountStatus, useAccountStatus } from "../account/store";
import { PersonField } from "./PersonField";
import { goToTitle } from "../title/origin";
import { Button } from "../ui/Button";
import { Chip, RadioChip } from "../ui/Chip";
import { GlassPanel } from "../ui/GlassPanel";
import { cx } from "../ui/cx";
import { CloseIcon } from "../ui/icons";
import { Skeleton } from "../ui/Skeleton";
import { TextLink } from "../ui/TextLink";
import { Digits, Slider } from "../ui/Slider";

const TYPES: { value: TypeChoice; label: string }[] = [
    { value: "movie", label: "Filmes" },
    { value: "series", label: "Séries" },
    { value: "both", label: "Os dois" },
];

const section = "flex flex-col gap-2 border-t border-line px-1 pt-3";

const thousands = new Intl.NumberFormat("pt-BR");

// A lista do contador vem uma vez por aba; se falhar, a próxima abertura tenta de novo.
let candidatesRequest: Promise<FilterCandidate[]> | null = null;
function loadCandidates() {
    candidatesRequest ??= filterCandidates().catch((error: unknown) => {
        candidatesRequest = null;
        throw error;
    });
    return candidatesRequest;
}

// Os títulos de cada pessoa escolhida, uma vez por aba (person-search B3); falha não fica guardada.
const personRequests = new Map<number, Promise<number[]>>();
function loadPersonTitles(personId: number) {
    let request = personRequests.get(personId);
    if (!request) {
        request = personTitles({ personId }).then((ids) => {
            if (!ids) throw new Error("Títulos da pessoa indisponíveis");
            return ids;
        });
        request.catch(() => personRequests.delete(personId));
        personRequests.set(personId, request);
    }
    return request;
}

type FiltersPanelProps = {
    /** o endereço já fechou o painel; ele sai animado e avisa em onLeft */
    leaving: boolean;
    onClose: () => void;
    onLeft: () => void;
};

/**
 * Filtros de Escolher agora (US002). No computador, vidro sobre a capa no canto superior direito;
 * no celular, tela cheia e modal (C1). Os campos rolam por dentro, entre o título e o rodapé com o
 * contador. O contador conta no navegador sobre a lista do dia (C3), e o sorteio é no servidor (C6).
 */
export default function FiltersPanel({ leaving, onClose, onLeft }: FiltersPanelProps) {
    const router = useRouter();
    const titleId = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [more, setMore] = useState(false);
    const [stored, setStored] = useState(savedFilters);
    const status = useAccountStatus();
    const account = status.state === "account" ? status.account : null;
    // com a conta aberta o "Já vi" vem da conta; sem ela, do navegador (US015 C2)
    const [browserWatched] = useState(() => watchedTitles.read());
    const watched = useMemo(
        () => (account ? account.watched.map((t) => t.titleId) : browserWatched),
        [account, browserWatched],
    );
    // o convite de quem não tem conta ao tocar num sentimento (US015 C3)
    const [invite, setInvite] = useState(false);
    // O que a conta manda vale por cima do que a aba guardou: os streamings são os da conta, e sem
    // conta não há sentimento (RNE005). Derivado, sem estado novo.
    const filters = useMemo<Filters>(
        () => ({
            ...stored,
            ...(account && { streamings: account.streamings }),
            ...(status.state === "visitor" && stored.feeling !== null && { feeling: null }),
        }),
        [stored, account, status.state],
    );
    const [candidates, setCandidates] = useState<FilterCandidate[] | "error" | null>(null);
    const [attempt, setAttempt] = useState(0);
    // os títulos da pessoa do filtro, para o contador; o sorteio deriva os seus no servidor (A7)
    const [personIds, setPersonIds] = useState<{
        id: number;
        titles: Set<number> | "error";
    } | null>(null);
    const [drawFailed, setDrawFailed] = useState(false);
    const [pending, startTransition] = useTransition();
    const close = useEffectEvent(() => !leaving && onClose());
    const left = useEffectEvent(onLeft);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        // no celular (onde o CSS o fixa na tela cheia) é modal: o resto da página fica inerte
        if (getComputedStyle(dialog).position === "fixed") dialog.showModal();
        else dialog.show();
        // no computador o painel cabe na janela: se ele cresce (lista chegando, duração, dica) ou
        // abre mais abaixo, a página rola até ele
        const panel = panelRef.current;
        const fit = new ResizeObserver(() => {
            if (!dialog.matches(":modal")) panel?.scrollIntoView({ block: "nearest" });
        });
        if (panel) fit.observe(panel);
        // a Esc que um campo já usou (a lista da busca de pessoas fechando) não fecha o painel
        const onKey = (event: KeyboardEvent) =>
            event.key === "Escape" && !event.defaultPrevented && close();
        document.addEventListener("keydown", onKey);
        return () => {
            fit.disconnect();
            document.removeEventListener("keydown", onKey);
            dialog.close();
        };
    }, []);

    // com movimento reduzido não há animação de saída, então não há fim de animação a esperar
    useEffect(() => {
        const panel = panelRef.current;
        if (leaving && panel && getComputedStyle(panel).animationName === "none") left();
    }, [leaving]);

    useEffect(() => {
        let live = true;
        loadCandidates().then(
            (list) => live && setCandidates(list),
            () => live && setCandidates("error"),
        );
        return () => {
            live = false;
        };
    }, [attempt]);

    const personId = filters.person?.id ?? null;
    useEffect(() => {
        if (personId === null) return;
        let live = true;
        loadPersonTitles(personId).then(
            (ids) => live && setPersonIds({ id: personId, titles: new Set(ids) }),
            () => live && setPersonIds({ id: personId, titles: "error" }),
        );
        return () => {
            live = false;
        };
    }, [personId, attempt]);
    const personTitleSet =
        personId !== null && personIds?.id === personId ? personIds.titles : null;
    const failed = candidates === "error" || personTitleSet === "error";

    const count = useMemo(() => {
        if (!Array.isArray(candidates)) return null;
        if (personId === null) return matchTitles(candidates, filters, watched).length;
        // a pessoa escolhida ainda sem os títulos: o contador espera
        if (!(personTitleSet instanceof Set)) return null;
        return matchTitles(candidates, filters, watched, personTitleSet).length;
    }, [candidates, filters, watched, personId, personTitleSet]);

    // sobra campo abaixo da área visível? A folga de 1 cobre o arredondamento do zoom
    function measureScroll() {
        const el = scrollRef.current;
        if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    }

    // a área muda de tamanho com a janela, e o conteúdo com os campos (a duração aparece e some)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver(measureScroll);
        observer.observe(el);
        for (const child of el.children) observer.observe(child);
        return () => observer.disconnect();
    }, [filters.type]);

    function update(next: Filters) {
        setStored(next);
        setDrawFailed(false);
        // com a conta aberta, os streamings vão para a conta e o navegador não guarda nenhum
        saveFilters(next, !account);
        if (account && next.streamings.join(",") !== filters.streamings.join(",")) {
            const streamings = next.streamings;
            void saveStreamings({ streamings }).then((answer) => {
                if (answer.ok)
                    setAccountStatus({ state: "account", account: { ...account, streamings } });
            });
        }
    }

    function retry() {
        if (candidates === "error") setCandidates(null);
        setPersonIds(null);
        setAttempt((n) => n + 1);
    }

    function see() {
        if (pending) return;
        startTransition(async () => {
            try {
                const request = { filters, watched: watched.slice(-SURPRISE_MAX_EXCLUDED) };
                const { slug } = await drawFiltered({
                    filters: wireFilters(filters),
                    watched: request.watched,
                    seen: [],
                    // com a conta aberta o servidor lê tudo da conta e ignora estas listas (RNE003)
                    taste: account ? EMPTY_TASTE : tasteSignals.read(),
                    round: 0,
                });
                if (slug) {
                    // a rodada de "Outra opção" (US004 C2) começa aqui
                    filteredRun.start(request.filters, request.watched);
                    return goToTitle(router, "push", slug, "filtros");
                }
            } catch {
                // cai no aviso abaixo
            }
            setDrawFailed(true);
        });
    }

    const runtime = RUNTIME_LIMITS.findIndex((l) => l.minutes === filters.maxRuntime);
    const hint =
        failed || drawFailed
            ? `${loadError.heading}. Tente de novo.`
            : count === 0 &&
              (filters.feeling === null
                  ? "Tente baixar a nota ou marcar mais um streaming."
                  : // US008 C5
                    "Tente outro sentimento ou marque mais um streaming.");

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            // o Esc já fecha pelo onClose; sem isto, o modal fecharia sem passar pela URL
            onCancel={(event) => event.preventDefault()}
            inert={leaving}
            className="m-0 max-h-none max-w-none border-0 bg-transparent p-0 text-paper backdrop:bg-transparent max-desktop:fixed max-desktop:inset-0 max-desktop:size-full desktop:pointer-events-none desktop:absolute desktop:inset-4 desktop:z-2 desktop:size-auto desktop:open:flex desktop:open:items-start desktop:open:justify-end"
        >
            <GlassPanel
                ref={panelRef}
                onAnimationEnd={(event) =>
                    leaving && event.target === event.currentTarget && onLeft()
                }
                className={cx(
                    "min-h-0 overflow-hidden max-desktop:h-full desktop:pointer-events-auto desktop:max-h-panel-height desktop:w-filters desktop:max-w-full desktop:scroll-mb-4",
                    // com movimento reduzido, nem entra nem sai animado (CM004)
                    leaving
                        ? "motion-safe:max-desktop:animate-panel-down motion-safe:desktop:animate-panel-out"
                        : "motion-safe:max-desktop:animate-panel-up motion-safe:desktop:animate-panel-in",
                )}
            >
                <div className="flex items-start justify-between gap-3 px-1">
                    <h2 id={titleId} className="font-display text-heading font-medium">
                        O que você quer ver hoje?
                    </h2>
                    <Button variant="round" aria-label="Fechar filtros" onClick={onClose}>
                        <CloseIcon />
                    </Button>
                </div>

                {/* as margens negativas levam a rolagem até a borda, sem cortar o contorno de foco */}
                <div className="relative -mx-5 flex min-h-0 flex-1 flex-col max-desktop:-mx-4">
                    <div
                        ref={scrollRef}
                        onScroll={measureScroll}
                        className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 pb-1 max-desktop:px-4"
                    >
                        <div className={section}>
                            <span id={`${titleId}-feeling`} className="text-data text-soft">
                                O que você quer sentir hoje?
                            </span>
                            <div
                                role="group"
                                aria-labelledby={`${titleId}-feeling`}
                                className="flex flex-wrap gap-1.5"
                            >
                                {FEELINGS.map((f) => {
                                    const on = filters.feeling === f;
                                    return (
                                        <Chip
                                            key={f}
                                            pressed={on}
                                            // um só por vez; tocar no marcado volta a "nenhum" (C2)
                                            onClick={() => {
                                                // sentimento é só de quem tem conta (US015 C3)
                                                if (!account) return setInvite(true);
                                                update({ ...filters, feeling: on ? null : f });
                                            }}
                                        >
                                            {FEELING_LABELS[f]}
                                        </Chip>
                                    );
                                })}
                            </div>
                            {invite && !account && (
                                <p role="status" className="text-data text-soft">
                                    Crie sua conta para escolher pelo que sente.{" "}
                                    <TextLink href="/entrar" onClick={rememberReturn}>
                                        Entrar
                                    </TextLink>
                                </p>
                            )}
                        </div>

                        <div className={section}>
                            <span id={`${titleId}-streamings`} className="text-data text-soft">
                                Streamings
                            </span>
                            <div
                                role="group"
                                aria-labelledby={`${titleId}-streamings`}
                                className="flex flex-wrap gap-1.5"
                            >
                                {STREAMING_SERVICES.map((s) => {
                                    const on = filters.streamings.includes(s.id);
                                    return (
                                        <Chip
                                            key={s.id}
                                            pressed={on}
                                            onClick={() =>
                                                update({
                                                    ...filters,
                                                    streamings: on
                                                        ? filters.streamings.filter(
                                                              (id) => id !== s.id,
                                                          )
                                                        : [...filters.streamings, s.id],
                                                })
                                            }
                                        >
                                            {s.name}
                                        </Chip>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={section}>
                            <span id={`${titleId}-type`} className="text-data text-soft">
                                Tipo
                            </span>
                            <div
                                role="radiogroup"
                                aria-labelledby={`${titleId}-type`}
                                className="flex flex-wrap gap-1.5"
                            >
                                {TYPES.map((t) => (
                                    <RadioChip
                                        key={t.value}
                                        name={`${titleId}-type`}
                                        value={t.value}
                                        checked={filters.type === t.value}
                                        onChange={() => update(withType(filters, t.value))}
                                    >
                                        {t.label}
                                    </RadioChip>
                                ))}
                            </div>
                        </div>

                        <div className={section}>
                            <span id={`${titleId}-genres`} className="text-data text-soft">
                                Gênero
                            </span>
                            <div
                                role="group"
                                aria-labelledby={`${titleId}-genres`}
                                className="flex flex-wrap gap-1.5"
                            >
                                {KINNE_GENRES.filter(
                                    // o TMDB não tem Romance para séries (C8)
                                    (g) => g !== "romance" || filters.type !== "series",
                                ).map((g) => {
                                    const on = filters.genres.includes(g);
                                    return (
                                        <Chip
                                            key={g}
                                            pressed={on}
                                            onClick={() =>
                                                update({
                                                    ...filters,
                                                    genres: on
                                                        ? filters.genres.filter((x) => x !== g)
                                                        : [...filters.genres, g],
                                                })
                                            }
                                        >
                                            {GENRE_LABELS[g]}
                                        </Chip>
                                    );
                                })}
                            </div>
                        </div>

                        <div className={section}>
                            <span id={`${titleId}-rating`} className="text-data text-soft">
                                Classificação
                            </span>
                            <div
                                role="group"
                                aria-labelledby={`${titleId}-rating`}
                                className="flex flex-wrap gap-1.5"
                            >
                                {/* desligado por padrão: só com ele os títulos 18 entram (fase 4) */}
                                <Chip
                                    pressed={filters.adult}
                                    aria-label="18+, incluir títulos para maiores de 18 anos"
                                    onClick={() => update({ ...filters, adult: !filters.adult })}
                                >
                                    18+
                                </Chip>
                            </div>
                        </div>

                        <div className={section}>
                            <span id={`${titleId}-person`} className="text-data text-soft">
                                Buscar ator ou diretor
                            </span>
                            <PersonField
                                labelId={`${titleId}-person`}
                                value={filters.person}
                                onChange={(person) => update({ ...filters, person })}
                            />
                        </div>

                        <Slider
                            className={section}
                            label="Nota TMDB mínima"
                            min={MIN_RATING}
                            max={MAX_RATING}
                            step={0.1}
                            value={filters.minRating}
                            valueText={filters.minRating.toFixed(1).replace(".", ",")}
                            onChange={(event) =>
                                update({
                                    ...filters,
                                    minRating: Math.round(Number(event.target.value) * 10) / 10,
                                })
                            }
                        />

                        {filters.type === "movie" && (
                            <Slider
                                className={section}
                                label="Duração do filme"
                                min={0}
                                max={RUNTIME_LIMITS.length - 1}
                                step={1}
                                value={runtime}
                                valueText={RUNTIME_LIMITS[runtime].label}
                                onChange={(event) =>
                                    update({
                                        ...filters,
                                        maxRuntime:
                                            RUNTIME_LIMITS[Number(event.target.value)].minutes,
                                    })
                                }
                            />
                        )}
                    </div>
                    {/* há mais campos abaixo: degradê na base, que some no fim da rolagem */}
                    <div
                        aria-hidden="true"
                        className={cx(
                            "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-scroll-hint transition-opacity duration-fade motion-reduce:transition-none",
                            !more && "opacity-0",
                        )}
                    />
                </div>

                <div className="-mx-5 -mb-5 flex flex-col gap-3 bg-panel-foot px-5 pb-5 max-desktop:-mx-4 max-desktop:px-4 max-desktop:pb-safe">
                    <div className="flex items-center gap-3.5 border-t border-line px-1 pt-4">
                        <p
                            aria-live="polite"
                            className="flex min-w-23 flex-col items-center text-center text-caption text-faint"
                        >
                            <b className="pb-1.25 font-display text-count font-medium text-paper">
                                {count === null ? (
                                    <Skeleton shape="count" />
                                ) : (
                                    <Digits text={thousands.format(count)} />
                                )}
                            </b>
                            <span>{count === 1 ? "título combina" : "títulos combinam"}</span>
                        </p>
                        {failed ? (
                            <Button variant="primary" className="flex-1 px-2.5" onClick={retry}>
                                Tentar de novo
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                className="flex-1 px-2.5"
                                disabled={!count}
                                aria-busy={pending}
                                onClick={see}
                            >
                                Sortear um título
                            </Button>
                        )}
                    </div>
                    {hint && (
                        <p role="status" className="mx-1 text-data text-soft">
                            {hint}
                        </p>
                    )}
                </div>
            </GlassPanel>
        </dialog>
    );
}
