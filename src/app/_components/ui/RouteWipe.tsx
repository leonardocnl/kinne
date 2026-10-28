"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import type { ColorWipe as ColorWipeComponent, WipeOptions } from "./ColorWipe";
import { WIPE_EVENT } from "./wipe";

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
 * Cortina na troca de um título para outro ("Já vi", o dado, a rodada dos filtros), pedida com
 * `requestWipe` (ui/wipe.ts); só no computador e sem movimento reduzido. No celular, nas abas e nos
 * links a troca segue imediata. As faixas cobrem a tela, o roteador troca o endereço (replace) e
 * elas só saem quando a URL muda (no máximo em 2 s).
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
        const onWipe = (e: Event) => {
            if (!enabled()) return;
            // cancelar o evento avisa quem pediu que a cortina cuida da navegação
            e.preventDefault();
            setRun({
                href: (e as CustomEvent<string>).detail,
                from: location.pathname,
                step: "cover",
            });
        };
        window.addEventListener(WIPE_EVENT, onWipe);
        return () => window.removeEventListener(WIPE_EVENT, onWipe);
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
                        router.replace(run.href);
                        setRun({ ...run, step: "wait" });
                    }}
                    onUncovered={() => setRun(null)}
                />
            )}
        </>
    );
}
