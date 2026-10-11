"use client";

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { HomePick } from "../../_data/home";
import { Button } from "../ui/Button";
import { cx } from "../ui/cx";
import { Frame, FrameImage } from "../ui/Frame";
import { Fact, Facts } from "../ui/Facts";
import { PauseIcon, PlayIcon } from "../ui/icons";
import { TextLink } from "../ui/TextLink";
import { billingRow, screenMain } from "../layout";
import { titleHref } from "../title/origin";
import { useSurprise } from "../title/useSurprise";
import { FiltersPanel, useFiltersRoute } from "./FiltersPanel";
import { initialRotation, rotate } from "./rotation";
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
export function DailyPicks({ date, picks }: { date: string; picks: HomePick[] }) {
    const reducedMotion = useReducedMotion();
    const [rotation, dispatch] = useReducer(rotate, initialRotation);
    const pauseRef = useRef<HTMLButtonElement>(null);
    const surprise = useSurprise("push");
    const filters = useFiltersRoute();
    const chooseRef = useRef<HTMLButtonElement>(null);
    // o painel fica montado enquanto sai, depois que o endereço já o fechou
    const [panelMounted, setPanelMounted] = useState(filters.open);
    if (filters.open && !panelMounted) setPanelMounted(true);

    const { current, playing } = rotation;
    const rotating = playing && !reducedMotion;
    // com movimento reduzido não há troca animada, nem uma que tenha ficado pela metade
    const { shown, swap } = reducedMotion ? { shown: current, swap: "idle" } : rotation;
    const pick = picks[shown];

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
                            p.backdropImagePath && (
                                <FrameImage
                                    key={p.slug}
                                    path={p.backdropImagePath}
                                    visible={i === current}
                                    priority={i === 0}
                                />
                            ),
                    )}
                    <div className="absolute top-2.5 left-3 flex items-center gap-2 text-caption text-paper">
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
                        <span>
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

                <div className={billingRow}>
                    <div
                        className={cx(
                            "flex min-w-0 flex-col gap-3.5 transition-opacity duration-fade motion-reduce:transition-none max-desktop:gap-3",
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
                        <p
                            className={cx(
                                "max-w-measure text-tagline text-soft transition-opacity duration-fade motion-reduce:transition-none",
                                swap === "out" && "opacity-0",
                            )}
                        >
                            {pick.phrase}
                        </p>
                        <Facts
                            className={cx(
                                "transition-opacity duration-fade motion-reduce:transition-none",
                                swap === "out" && "opacity-0",
                            )}
                        >
                            {pick.facts.map((text) => (
                                <Fact key={text}>{text}</Fact>
                            ))}
                            {pick.streaming && (
                                <Fact className="max-desktop:basis-full max-desktop:border-l-0 max-desktop:pl-0">
                                    Disponível {pick.streaming.preposition}{" "}
                                    <b className="font-medium text-paper">{pick.streaming.name}</b>
                                </Fact>
                            )}
                        </Facts>
                        <TextLink href={titleHref(pick.slug, "dia")} className="-mt-1.5 -mb-2.5">
                            Ver este título<span className="sr-only">: {pick.title}</span>{" "}
                            <span aria-hidden="true">→</span>
                        </TextLink>
                    </div>
                    {/* um amarelo por tela (CM003): com os filtros abertos, o de trás some */}
                    <div
                        className={cx(
                            "flex gap-2.5 transition-opacity duration-fade motion-reduce:transition-none desktop:pb-11.5",
                            filters.open && "invisible opacity-0",
                        )}
                    >
                        <Button
                            ref={chooseRef}
                            variant="primary"
                            onClick={filters.show}
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
                </div>
                {panelMounted && (
                    <FiltersPanel
                        leaving={!filters.open}
                        onClose={filters.hide}
                        onLeft={() => {
                            setPanelMounted(false);
                            // ao fechar, o foco volta a "Escolher agora" (C5)
                            chooseRef.current?.focus();
                        }}
                    />
                )}
            </div>

            <TodayReel picks={picks} current={current} onSelect={show} />
        </main>
    );
}
