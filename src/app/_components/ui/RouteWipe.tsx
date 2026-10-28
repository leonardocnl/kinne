"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import type { ColorWipe as ColorWipeComponent, WipeOptions } from "./ColorWipe";
import { wipeHref } from "./wipeLink";

// teto da espera pela tela nova: depois disso as faixas saem de qualquer jeito
const MAX_WAIT_MS = 2000;

type Run = { href: string; from: string; step: "cover" | "wait" | "uncover" };

// usePathname suspende nas rotas com parâmetro desconhecido no build: fica num Suspense próprio,
// para não tirar o resto da página do prerender
function PathnameWatch({ onChange }: { onChange: (pathname: string) => void }) {
    const pathname = usePathname();
    useEffect(() => onChange(pathname), [pathname, onChange]);
    return null;
}

/**
 * Cortina na troca de tela por link interno (ColorWipe), só no computador e sem movimento
 * reduzido; no celular a troca segue imediata. As faixas cobrem a tela, o roteador navega e elas
 * só saem quando a URL muda (no máximo em 2 s). Voltar e avançar do navegador não passam por aqui.
 * A navegação leva o tipo "wipe", e a luz da navbar não desliza com ele (veja a Navbar).
 */
export function RouteWipe({ children, ...options }: WipeOptions & { children: ReactNode }) {
    const router = useRouter();
    const probe = useRef<HTMLSpanElement>(null);
    const [Wipe, setWipe] = useState<typeof ColorWipeComponent | null>(null);
    const [run, setRun] = useState<Run | null>(null);
    const [pathname, setPathname] = useState("");

    // o probe só aparece no computador sem movimento reduzido (breakpoint desktop do Tailwind)
    const enabled = () => !!probe.current && getComputedStyle(probe.current).display !== "none";

    useEffect(() => {
        if (!enabled()) return;
        let alive = true;
        import("./ColorWipe").then((mod) => alive && setWipe(() => mod.ColorWipe));
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (!Wipe || run) return;
        const onClick = (e: MouseEvent) => {
            const anchor = e.target instanceof Element ? e.target.closest("a") : null;
            if (!anchor || !enabled()) return;
            const href = wipeHref(e, anchor, location);
            if (!href) return;
            // sem stopPropagation: o onClick do link ainda roda; o Link vê defaultPrevented e não navega
            e.preventDefault();
            setRun({ href, from: location.pathname, step: "cover" });
        };
        document.addEventListener("click", onClick, { capture: true });
        return () => document.removeEventListener("click", onClick, { capture: true });
    }, [Wipe, run]);

    useEffect(() => {
        if (run?.step !== "wait") return;
        const timer = setTimeout(
            () => setRun((current) => current && { ...current, step: "uncover" }),
            MAX_WAIT_MS,
        );
        return () => clearTimeout(timer);
    }, [run?.step]);

    const covering = run?.step === "cover" || (run?.step === "wait" && pathname === run.from);

    return (
        <>
            <span
                ref={probe}
                aria-hidden="true"
                className="pointer-events-none fixed hidden desktop:motion-safe:block"
            />
            {children}
            <Suspense fallback={null}>
                <PathnameWatch onChange={setPathname} />
            </Suspense>
            {Wipe && run && (
                <Wipe
                    {...options}
                    covering={covering}
                    onCovered={() => {
                        router.push(run.href, { transitionTypes: ["wipe"] });
                        setRun({ ...run, step: "wait" });
                    }}
                    onUncovered={() => setRun(null)}
                />
            )}
        </>
    );
}
