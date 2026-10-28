"use client";

import {
    lazy,
    Suspense,
    useEffect,
    useReducer,
    useRef,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";
import type { HomePick } from "../../_data/home";
import { Button, ButtonLink } from "../ui/Button";
import { cx } from "../ui/cx";
import { Frame, FrameImage } from "../ui/Frame";
import { GroupIcon, PauseIcon, PlayIcon } from "../ui/icons";
import { TextLink } from "../ui/TextLink";
import { TmdbImage } from "../ui/TmdbImage";
import { largePosterSources, TITLE_POSTER_SIZES } from "../ui/tmdb-sources";
import { screenMain } from "../layout";
import { titleOrigin } from "@/infrastructure/browser-storage";
import { titleHref } from "../title/origin";
import { useSurprise } from "../title/useSurprise";
import { useFiltersRoute } from "./filtersRoute";
import { initialRotation, rotate } from "./rotation";

// O painel dos filtros só é baixado quando a pessoa chega perto de "Escolher agora" (orçamento de
// JS da tela inicial); o hook que diz se ele está aberto fica fora dele.
const loadFiltersPanel = () => import("./FiltersPanel");
const FiltersPanel = lazy(loadFiltersPanel);
const preloadFiltersPanel = () => void loadFiltersPanel();
import { TodayReel } from "./TodayReel";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
    const query = matchMedia(REDUCED_MOTION);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}

function useReducedMotion() {
    return useSyncExternalStore(
        subscribeToReducedMotion,
        () => matchMedia(REDUCED_MOTION).matches,
        () => false,
    );
}

/**
 * Indicações do dia (US001): quadro com rotação automática, texto da indicação em destaque e a
 * faixa "Hoje". A rotação para no primeiro toque ou tecla (fora do botão de pausa) e não existe
 * com movimento reduzido (CM004).
 */
export function DailyPicks({
    date,
    picks,
    specs,
}: {
    date: string;
    picks: HomePick[];
    // a ficha de cada indicação (PickSpecs), feita no servidor: fica fora do JS da home
    specs: ReactNode[];
}) {
    const reducedMotion = useReducedMotion();
    const [rotation, dispatch] = useReducer(rotate, initialRotation);
    const pauseRef = useRef<HTMLButtonElement>(null);
    const surprise = useSurprise("push");
    const filters = useFiltersRoute();
    const chooseRef = useRef<HTMLButtonElement>(null);
    // o painel fica montado enquanto sai, depois que o endereço já o fechou
    const [panelMounted, setPanelMounted] = useState(filters.open);
    if (filters.open && !panelMounted) setPanelMounted(true);
    // ao fechar, o foco volta a "Escolher agora" (C5). Só depois que o painel desmonta: no
    // celular ele é modal, e enquanto existe o resto da página é inerte e não aceita o foco
    const returnFocus = useRef(false);
    useEffect(() => {
        if (panelMounted || !returnFocus.current) return;
        returnFocus.current = false;
        chooseRef.current?.focus();
    }, [panelMounted]);

    const { current, playing } = rotation;
    const rotating = playing && !reducedMotion;
    // com movimento reduzido não há troca animada, nem uma que tenha ficado pela metade
    const { shown, swap } = reducedMotion ? { shown: current, swap: "idle" } : rotation;
    const pick = picks[shown];
    // imagens grandes: só as que já apareceram e a próxima da fila; as outras baixam quando chega
    // a vez delas, e não as cinco de uma vez ao abrir
    const [seen, setSeen] = useState(() => new Set([current]));
    if (!seen.has(current)) setSeen(new Set(seen).add(current));
    const wanted = (i: number) => seen.has(i) || i === (current + 1) % picks.length;

    useEffect(() => {
        const events = ["pointerdown", "keydown"] as const;
        const stop = (event: Event) => {
            if (pauseRef.current?.contains(event.target as Node)) return;
            dispatch({ type: "stop" });
            for (const name of events) window.removeEventListener(name, stop, true);
        };
        for (const name of events) window.addEventListener(name, stop, true);
        return () => {
            for (const name of events) window.removeEventListener(name, stop, true);
        };
    }, []);

    // com os filtros abertos, inclusive pelo endereço, as capas param
    useEffect(() => {
        if (filters.open) dispatch({ type: "stop" });
    }, [filters.open]);

    const show = (index: number) => dispatch({ type: "show", index, animate: !reducedMotion });

    return (
        <main className={screenMain}>
            {/* o painel dos filtros fica sobre a capa e o texto, no canto superior direito */}
            <div className={cx(screenMain, "relative")}>
                <Frame>
                    {picks.map(
                        (p, i) =>
                            p.backdropImagePath &&
                            wanted(i) && (
                                <FrameImage
                                    key={p.slug}
                                    path={p.backdropImagePath}
                                    width={p.backdropWidth}
                                    visible={i === current}
                                    priority={i === 0}
                                />
                            ),
                    )}
                    <div className="absolute top-2.5 left-3 flex items-center gap-2 rounded-tag bg-scrim-strong p-tag text-caption text-paper backdrop-blur-veil">
                        {!reducedMotion && (
                            <Button
                                ref={pauseRef}
                                variant="overlay"
                                aria-label={
                                    rotating
                                        ? "Pausar a troca de capas"
                                        : "Retomar a troca de capas"
                                }
                                onClick={() => dispatch({ type: "togglePause" })}
                            >
                                {rotating ? <PauseIcon /> : <PlayIcon />}
                            </Button>
                        )}
                        <span className="pr-2 pl-1">
                            {current + 1} de {picks.length}
                        </span>
                    </div>
                    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-rail">
                        {/* a barra cheia é o relógio: quando termina, vem a próxima capa */}
                        <i
                            key={`${current}-${rotating}`}
                            className={cx(
                                "block h-full origin-left bg-paper motion-reduce:animate-none",
                                rotating && "animate-fill",
                            )}
                            style={
                                rotating
                                    ? { animationDuration: `${picks[current].seconds}s` }
                                    : undefined
                            }
                            onAnimationEnd={
                                rotating ? () => show((current + 1) % picks.length) : undefined
                            }
                        />
                    </div>
                </Frame>

                {/* como a tela do título (US001 C1): no computador, pôster | texto | ações, com as
                    ações na altura da primeira linha do título; sem sinopse nem elenco, que ficam
                    na tela do título. No celular, sem pôster e as ações embaixo */}
                <div className="title-layout pt-2 max-desktop:flex max-desktop:flex-col desktop:pt-3.5">
                    {pick.posterImagePath && (
                        // só no computador; lazy e escondido, o celular nem baixa
                        <TmdbImage
                            key={pick.slug}
                            sources={largePosterSources(pick.posterImagePath)}
                            sizes={TITLE_POSTER_SIZES}
                            className={cx(
                                "hidden aspect-2/3 w-title-poster transition-opacity duration-fade motion-reduce:transition-none desktop:col-start-1 desktop:row-span-3 desktop:row-start-1 desktop:mr-12 desktop:block",
                                swap === "out" && "opacity-0",
                            )}
                        />
                    )}
                    <div
                        className={cx(
                            "flex min-w-0 flex-col gap-3 transition-opacity duration-fade motion-reduce:transition-none desktop:col-start-2 desktop:row-span-3 desktop:row-start-1 desktop:mr-12 desktop:gap-3.5",
                            filters.open && "opacity-35",
                        )}
                    >
                        <p className="-mb-1 text-data text-soft desktop:hidden">{date}</p>
                        <h1
                            className={cx(
                                "pb-1 font-display text-title font-medium text-balance",
                                swap !== "idle" && "clip-title",
                            )}
                        >
                            <span
                                className={cx(
                                    "block",
                                    swap === "out" && "animate-rise-out",
                                    swap === "in" && "animate-rise-in",
                                )}
                                onAnimationEnd={() => dispatch({ type: "titleAnimationEnd" })}
                            >
                                {pick.title}
                            </span>
                        </h1>
                        <div
                            className={cx(
                                "transition-opacity duration-fade motion-reduce:transition-none desktop:my-2",
                                swap === "out" && "opacity-0",
                            )}
                        >
                            {specs[shown]}
                        </div>
                        <p
                            className={cx(
                                "max-w-measure text-tagline text-balance text-paper transition-opacity duration-fade motion-reduce:transition-none",
                                swap === "out" && "opacity-0",
                            )}
                        >
                            {pick.phrase}
                        </p>
                        <TextLink
                            href={titleHref(pick.slug)}
                            onClick={() => titleOrigin.set(pick.slug, "dia")}
                            className="-mt-1.5 -mb-2.5"
                        >
                            Ver este título<span className="sr-only">: {pick.title}</span>{" "}
                            <span aria-hidden="true">→</span>
                        </TextLink>
                    </div>
                    {/* um amarelo por tela (CM003): com os filtros abertos, o de trás some. No
                        computador, os três lado a lado; no celular, o par e o grupo embaixo */}
                    <div
                        className={cx(
                            "flex flex-col gap-2 transition-opacity duration-fade motion-reduce:transition-none max-desktop:mt-5 desktop:col-start-3 desktop:row-start-1 desktop:h-title-line desktop:flex-row desktop:items-center desktop:justify-end desktop:gap-2.5",
                            filters.open && "invisible opacity-0",
                        )}
                    >
                        <div className="flex gap-2.5">
                            <Button
                                ref={chooseRef}
                                variant="primary"
                                onClick={filters.show}
                                onPointerEnter={preloadFiltersPanel}
                                onFocus={preloadFiltersPanel}
                                className="max-desktop:min-w-0 max-desktop:flex-1 max-desktop:px-2.5 desktop:min-w-42"
                            >
                                Escolher agora
                            </Button>
                            <Button
                                variant="quiet"
                                onClick={() => surprise.draw()}
                                aria-busy={surprise.pending}
                                className="max-desktop:min-w-0 max-desktop:flex-1 max-desktop:px-2.5 desktop:min-w-42"
                            >
                                Me surpreenda
                            </Button>
                        </div>
                        {/* discreto, sem a cor de destaque (US011 C1, CM003): o botão ghost, o mais
                            apagado, com o ícone de grupo */}
                        <ButtonLink variant="ghost" href="/sala" icon={<GroupIcon />}>
                            Assistir em grupo
                        </ButtonLink>
                    </div>
                </div>
                {panelMounted && (
                    <Suspense>
                        <FiltersPanel
                            leaving={!filters.open}
                            onClose={filters.hide}
                            onLeft={() => {
                                returnFocus.current = true;
                                setPanelMounted(false);
                            }}
                        />
                    </Suspense>
                )}
            </div>

            <TodayReel picks={picks} current={current} onSelect={show} />
        </main>
    );
}
