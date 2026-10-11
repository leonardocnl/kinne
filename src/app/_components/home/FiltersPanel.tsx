"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    useEffect,
    useEffectEvent,
    useId,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    useTransition,
} from "react";
import { MIN_RATING } from "@/domain/catalog";
import {
    filterTitles,
    MAX_RATING,
    RUNTIME_LIMITS,
    withType,
    type FilterCandidate,
    type Filters,
    type TypeChoice,
} from "@/domain/filters";
import { GENRE_LABELS, KINNE_GENRES } from "@/domain/genre";
import { STREAMING_SERVICES } from "@/domain/streaming";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import {
    filteredRun,
    saveFilters,
    savedFilters,
    watchedTitles,
} from "@/infrastructure/browser-storage";
import { drawFiltered, filterCandidates } from "../../_actions/filters";
import { loadError } from "../StateScreen";
import { titleHref } from "../title/origin";
import { Button } from "../ui/Button";
import { Chip, RadioChip } from "../ui/Chip";
import { GlassPanel } from "../ui/GlassPanel";
import { cx } from "../ui/cx";
import { CloseIcon } from "../ui/icons";
import { Skeleton } from "../ui/Skeleton";
import { Digits, Slider } from "../ui/Slider";

const TYPES: { value: TypeChoice; label: string }[] = [
    { value: "movie", label: "Filmes" },
    { value: "series", label: "Séries" },
    { value: "both", label: "Os dois" },
];

const section = "flex flex-col gap-2 border-t border-line px-1 pt-3";

const thousands = new Intl.NumberFormat("pt-BR");

const noop = () => () => {};

/**
 * O painel aberto vive na URL (?filtros), sem os valores: o "voltar" fecha o painel (C5) e
 * recarregar a página o mantém aberto. Os valores ficam no navegador (RNG005). Só abre depois da
 * hidratação, porque os valores salvos não existem no servidor.
 */
export function useFiltersRoute() {
    const hydrated = useSyncExternalStore(
        noop,
        () => true,
        () => false,
    );
    const open = useSearchParams().has("filtros") && hydrated;
    // aberto por aqui: fechar é voltar. Aberto pelo endereço: fechar só tira o ?filtros
    const pushed = useRef(false);
    return {
        open,
        show() {
            pushed.current = true;
            window.history.pushState(null, "", "?filtros");
        },
        hide() {
            if (pushed.current) window.history.back();
            else window.history.replaceState(null, "", window.location.pathname);
            pushed.current = false;
        },
    };
}

// A lista do contador vem uma vez por aba; se falhar, a próxima abertura tenta de novo.
let candidatesRequest: Promise<FilterCandidate[]> | null = null;
function loadCandidates() {
    candidatesRequest ??= filterCandidates().catch((error: unknown) => {
        candidatesRequest = null;
        throw error;
    });
    return candidatesRequest;
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
export function FiltersPanel({ leaving, onClose, onLeft }: FiltersPanelProps) {
    const router = useRouter();
    const titleId = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [more, setMore] = useState(false);
    const [filters, setFilters] = useState(savedFilters);
    const [watched] = useState(() => watchedTitles.read());
    const [candidates, setCandidates] = useState<FilterCandidate[] | "error" | null>(null);
    const [attempt, setAttempt] = useState(0);
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
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
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

    const count = useMemo(
        () => (Array.isArray(candidates) ? filterTitles(candidates, filters, watched).count : null),
        [candidates, filters, watched],
    );

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
        setFilters(next);
        setDrawFailed(false);
        saveFilters(next);
    }

    function retry() {
        setCandidates(null);
        setAttempt((n) => n + 1);
    }

    function see() {
        if (pending) return;
        startTransition(async () => {
            try {
                const request = { filters, watched: watched.slice(-SURPRISE_MAX_EXCLUDED) };
                const { slug } = await drawFiltered({ ...request, seen: [] });
                if (slug) {
                    // a rodada de "Outra opção" (US004 C2) começa aqui
                    filteredRun.start(request.filters, request.watched);
                    return router.push(titleHref(slug, "filtros"));
                }
            } catch {
                // cai no aviso abaixo
            }
            setDrawFailed(true);
        });
    }

    const runtime = RUNTIME_LIMITS.findIndex((l) => l.minutes === filters.maxRuntime);
    const hint =
        candidates === "error" || drawFailed
            ? `${loadError.heading}. Tente de novo.`
            : count === 0 && "Tente baixar a nota ou marcar mais um streaming.";

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
                    "min-h-0 overflow-hidden max-desktop:h-full desktop:pointer-events-auto desktop:max-h-panel-height desktop:w-panel desktop:max-w-full desktop:scroll-mb-4",
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
                        {candidates === "error" ? (
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
                                Ver recomendação
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
