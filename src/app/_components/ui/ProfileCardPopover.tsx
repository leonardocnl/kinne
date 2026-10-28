"use client";

import {
    domAnimation,
    LazyMotion,
    type MotionStyle,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
    type Variants,
} from "motion/react";
import * as m from "motion/react-m";
import { type MouseEvent as ReactMouseEvent, type RefObject, useEffect, useRef } from "react";
import { cx } from "./cx";
import { glassSurface } from "./GlassPanel";

// Adaptado do LinkedinCard e do GithubCard do Great UI (créditos no fim do arquivo): sem banner,
// foto, conexões nem grade de contribuições, sem nada da rede e só no tema escuro. Fica fora do JS
// inicial: o ProfileCard baixa este arquivo (e o motion) quando o rodapé chega perto.

export type Profile = "linkedin" | "github";

const GITHUB_URL = "https://github.com/leonardocnl";
const MAX_ROTATE = 5;

const LinkedinIcon = ({ className }: { className?: string }) => (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cx("fill-current", className)}>
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
);

/** Entrada do original (blur, escala e deslize); com movimento reduzido o cartão só aparece e some. */
export function cardVariants(reduced: boolean): Variants {
    if (reduced)
        return {
            hidden: { opacity: 0, pointerEvents: "none", transition: { duration: 0 } },
            visible: { opacity: 1, pointerEvents: "auto", transition: { duration: 0 } },
        };
    return {
        hidden: {
            opacity: 0,
            y: 6,
            scale: 0.98,
            filter: "blur(0.125rem)",
            pointerEvents: "none",
            transformOrigin: "bottom right",
            transition: { duration: 0.15, ease: "easeIn" },
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0rem)",
            pointerEvents: "auto",
            transformOrigin: "bottom right",
            transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
        },
    };
}

function Content({ profile }: { profile: Profile }) {
    if (profile === "github")
        return (
            <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-target items-center self-start font-display text-confirm font-medium text-paper underline-offset-5 hover:underline"
            >
                leonardocnl
            </a>
        );
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
                <p className="font-display text-confirm font-medium text-paper">
                    Leonardo Carvalho Silva
                </p>
                <p className="text-small text-pretty text-soft">
                    Information Systems @ UFLA | Founder @ Kinne
                </p>
                <p className="text-caption text-faint">Brasil</p>
            </div>
            <LinkedinIcon className="size-6 shrink-0 text-paper" />
        </div>
    );
}

/**
 * O cartão que sobe acima do link do rodapé e inclina em 3D seguindo o mouse, sobre o link
 * (`anchor`) e sobre o próprio cartão. Fechado, fica invisível e inerte.
 */
export default function ProfileCardPopover({
    profile,
    open,
    anchor,
}: {
    profile: Profile;
    open: boolean;
    anchor: RefObject<HTMLElement | null>;
}) {
    const reduced = useReducedMotion() ?? false;
    const cardRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });
    const rotateX = useTransform(
        mouseYSpring,
        (val) => MAX_ROTATE - ((val + 20) / 40) * 2 * MAX_ROTATE,
    );
    const rotateY = useTransform(
        mouseXSpring,
        (val) => -MAX_ROTATE + ((val + 20) / 40) * 2 * MAX_ROTATE,
    );

    // posição do mouse de -20 a 20 em cada eixo, relativa ao link ou ao cartão (o que estiver sob ele)
    const track = (e: MouseEvent | ReactMouseEvent, target: Element | null) => {
        if (reduced || !target) return;
        const rect = target.getBoundingClientRect();
        x.set(((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 20);
        y.set(((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 20);
    };

    useEffect(() => {
        const link = anchor.current?.firstElementChild ?? null;
        if (!link) return;
        const onMove = (e: Event) => track(e as MouseEvent, link);
        link.addEventListener("mousemove", onMove);
        return () => link.removeEventListener("mousemove", onMove);
    });

    useEffect(() => {
        if (open) return;
        x.set(0);
        y.set(0);
    }, [open, x, y]);

    const style: MotionStyle = reduced
        ? {}
        : { x: mouseXSpring, rotateX, rotateY, transformStyle: "preserve-3d" };

    return (
        <LazyMotion features={domAnimation} strict>
            <m.div
                ref={cardRef}
                inert={!open}
                onMouseMove={(e) => track(e, cardRef.current)}
                initial="hidden"
                animate={open ? "visible" : "hidden"}
                variants={cardVariants(reduced)}
                style={style}
                className={cx(
                    glassSurface,
                    // a ponte (after) mantém o hover entre o link e o cartão
                    "absolute bottom-full z-50 mb-4 flex w-80 flex-col p-panel text-left after:absolute after:top-full after:left-0 after:h-4 after:w-full max-desktop:left-0 desktop:right-0",
                )}
            >
                <Content profile={profile} />
            </m.div>
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
