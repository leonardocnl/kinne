"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import type { ColorWipe as ColorWipeComponent, WipeOptions } from "./ColorWipe";
import { WIPE_CANCEL_EVENT, WIPE_EVENT } from "./wipe";

// tetos: da tela nova (depois da troca do endereço) e do sorteio (antes de saber o destino);
// passado o teto, as faixas saem de qualquer jeito
const MAX_WAIT_MS = 2000;
const MAX_DRAW_MS = 4000;

// href null: a cortina começou no clique e o destino ainda vem do sorteio
type Run = { href: string | null; from: string; step: "cover" | "covered" | "wait" | "uncover" };

// usePathname suspende nas rotas com parâmetro desconhecido no build: fica num Suspense próprio,
// para não tirar o resto da página do prerender
function PathnameWatch({ onChange }: { onChange: (pathname: string) => void }) {
    const pathname = usePathname();
    useEffect(() => onChange(pathname), [pathname, onChange]);
    return null;
}

/**
 * Cortina na troca de um título para outro ("Já vi", o dado, a rodada dos filtros), pedida com
 * `beginWipe` no clique e `requestWipe` com o destino (ui/wipe.ts): as faixas já cobrem a tela
 * enquanto o servidor sorteia. Só no computador e sem movimento reduzido. No celular, nas abas e nos
 * links a troca segue imediata. As faixas cobrem a tela, o roteador troca o endereço (replace) e
 * elas só saem quando a URL muda e a imagem grande da tela nova carregou (no máximo em 2 s).
 */
export function RouteWipe({ children, ...options }: WipeOptions & { children: ReactNode }) {
    const router = useRouter();
    const probe = useRef<HTMLSpanElement>(null);
    const [Wipe, setWipe] = useState<typeof ColorWipeComponent | null>(null);
    const [run, setRun] = useState<Run | null>(null);
    // cópia síncrona: o evento e o fim da animação leem o passo atual sem esperar o render
    const runRef = useRef<Run | null>(null);
    const update = (next: Run | null) => {
        runRef.current = next;
        setRun(next);
    };
    const navigate = (current: Run & { href: string }) => {
        router.replace(current.href);
        update({ ...current, step: "wait" });
    };
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
        if (!Wipe) return;
        const onWipe = (e: Event) => {
            if (!enabled()) return;
            // cancelar o evento avisa quem pediu que a cortina cuida da navegação
            e.preventDefault();
            const href = (e as CustomEvent<string | null>).detail;
            const current = runRef.current;
            if (!current) return update({ href, from: location.pathname, step: "cover" });
            if (!href || current.href) return;
            // o destino chegou: se as faixas já cobrem a tela, navega; senão, navega ao cobrir
            if (current.step === "covered") navigate({ ...current, href });
            else update({ ...current, href });
        };
        // o sorteio não levou a outro título: as faixas saem sem trocar nada
        const onCancel = () => {
            const current = runRef.current;
            if (current && !current.href) update({ ...current, step: "uncover" });
        };
        window.addEventListener(WIPE_EVENT, onWipe);
        window.addEventListener(WIPE_CANCEL_EVENT, onCancel);
        return () => {
            window.removeEventListener(WIPE_EVENT, onWipe);
            window.removeEventListener(WIPE_CANCEL_EVENT, onCancel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- update e navigate só usam refs e o router
    }, [Wipe]);

    useEffect(() => {
        if (run?.step !== "wait" && run?.step !== "covered") return;
        const timer = setTimeout(
            () => runRef.current && update({ ...runRef.current, step: "uncover" }),
            run.step === "wait" ? MAX_WAIT_MS : MAX_DRAW_MS,
        );
        return () => clearTimeout(timer);
    }, [run?.step]);

    // a URL mudou: as faixas só saem quando a imagem grande da tela nova já carregou e foi
    // decodificada (o teto de MAX_WAIT_MS continua valendo)
    useEffect(() => {
        if (run?.step !== "wait" || pathname === run.from) return;
        let alive = true;
        // o Next guarda a tela anterior escondida (Activity): vale a imagem que está visível
        const hero = [
            ...document.querySelectorAll<HTMLImageElement>('main img[fetchpriority="high"]'),
        ].find((img) => img.checkVisibility());
        (hero ? hero.decode().catch(() => {}) : Promise.resolve()).then(
            () => alive && runRef.current && update({ ...runRef.current, step: "uncover" }),
        );
        return () => {
            alive = false;
        };
    }, [run?.step, run?.from, pathname]);

    const covering = !!run && run.step !== "uncover";

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
                        const current = runRef.current!;
                        if (current.href) navigate({ ...current, href: current.href });
                        else update({ ...current, step: "covered" });
                    }}
                    onUncovered={() => update(null)}
                />
            )}
        </>
    );
}
