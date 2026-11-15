"use client";

import { domAnimation, LazyMotion, type Transition } from "motion/react";
import * as m from "motion/react-m";

// Adaptado do ColorWipePageTransition do Great UI (créditos no fim do arquivo): faixas de vidro
// com um fio na frente e outro atrás, do `signal` ao `signal-deep` (sem arco-íris), e a troca
// guiada pelo fim das animações em vez de timers. Fica fora do JS inicial: o RouteWipe baixa este
// arquivo (e o motion) depois de a página abrir, só no computador.

export type WipeDirection = "top" | "bottom" | "left" | "right";

export type WipeOptions = {
    columns?: number;
    duration?: number;
    staggerDelay?: number;
    ease?: Transition["ease"];
    direction?: WipeDirection;
    exitOpposite?: boolean;
};

// faixa no vidro do site (o da navbar, com o desfoque do painel). O desfoque fica, mas só o
// transform anima: cada faixa é uma camada própria (will-change) e o deslize roda no compositor
const pane =
    "bg-nav bg-linear-to-b from-sheen to-transparent backdrop-blur-glass backdrop-saturate-glass backdrop-brightness-45 will-change-transform";

/** Tempo de cobrir (e o de descobrir) a tela, em segundos. */
export const wipeSeconds = (duration: number, columns: number, staggerDelay: number) =>
    duration + (columns - 1) * staggerDelay;

// fio da faixa i: do signal (primeira) ao âmbar (última); o de trás vai ao contrário
const stroke = (share: number) =>
    `color-mix(in oklab, var(--color-signal), var(--color-signal-deep) ${Math.round(share * 100)}%)`;

/**
 * As faixas: entram cobrindo a tela (`covering`) e saem descobrindo. Avisa quando a última
 * termina de entrar (`onCovered`) e de sair (`onUncovered`). Decorativa: aria-hidden; enquanto
 * existe, bloqueia os cliques.
 */
export function ColorWipe({
    covering,
    onCovered,
    onUncovered,
    columns = 10,
    duration = 0.55,
    staggerDelay = 0.03,
    // entra e sai suave (ease-in-out cúbica); o original, [0.85, 0, 0.15, 1], é brusco
    ease = [0.65, 0, 0.35, 1],
    direction = "top",
    exitOpposite = false,
}: WipeOptions & { covering: boolean; onCovered: () => void; onUncovered: () => void }) {
    const isVertical = direction === "top" || direction === "bottom";
    const from = direction === "bottom" || direction === "right" ? "100%" : "-100%";
    const to = exitOpposite ? (from === "100%" ? "-100%" : "100%") : from;
    // transform inteiro (e não x/y do motion): assim a animação vai para o WAAPI, fora da thread
    // principal, e não trava enquanto a tela nova renderiza por baixo
    const offset = (value: string) => ({
        transform: isVertical ? `translate3d(0, ${value}, 0)` : `translate3d(${value}, 0, 0)`,
    });

    // posição dos fios: na frente (leading) e atrás (trailing) de cada faixa, no sentido do movimento
    const edges = {
        left: ["top-0 right-0 bottom-0", "top-0 bottom-0 left-0"],
        right: ["top-0 bottom-0 left-0", "top-0 right-0 bottom-0"],
        top: ["right-0 bottom-0 left-0", "top-0 right-0 left-0"],
        bottom: ["top-0 right-0 left-0", "right-0 bottom-0 left-0"],
    }[direction];
    const thickness = isVertical ? "h-2.5" : "w-2.5";

    return (
        <LazyMotion features={domAnimation} strict>
            <div
                aria-hidden="true"
                className={`pointer-events-none fixed inset-0 z-100 flex size-full ${isVertical ? "flex-row" : "flex-col"}`}
            >
                {Array.from({ length: columns }, (_, i) => {
                    const share = columns > 1 ? i / (columns - 1) : 0;
                    const last = i === columns - 1;
                    return (
                        <m.div
                            key={i}
                            initial={offset(from)}
                            animate={covering ? offset("0%") : offset(to)}
                            transition={{ duration, ease, delay: i * staggerDelay }}
                            onAnimationComplete={
                                last ? () => (covering ? onCovered() : onUncovered()) : undefined
                            }
                            className={`pointer-events-auto relative flex flex-1 items-center ${pane}`}
                        >
                            <div
                                className={`shadow-md absolute ${edges[0]} ${thickness}`}
                                style={{ backgroundColor: stroke(share) }}
                            />
                            <div
                                className={`shadow-md absolute ${edges[1]} ${thickness}`}
                                style={{ backgroundColor: stroke(1 - share) }}
                            />
                        </m.div>
                    );
                })}
            </div>
        </LazyMotion>
    );
}

/**
 * Great UI Component
 *
 * Built with React, TypeScript, Tailwind CSS, and Framer Motion.
 * Designed to be accessible, customizable, and production-ready.
 *
 * Website: https://great-ui.com
 * GitHub: https://github.com/Saurabh-2607/GreatUI
 * X (Great UI): https://x.com/GreatUIHQ
 *
 * Released under the Great UI Custom License Agreement.
 * Contributions, issues, and feature requests are always welcome.
 *
 * Author: Saurabh Sharma
 * X: https://x.com/srbh_here
 */
