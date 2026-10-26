"use client";

import { lazy, type ReactNode, Suspense, useEffect, useRef, useState } from "react";

const GradientAscii = lazy(() => import("./GradientAscii"));

/**
 * Troca o horizonte em CSS (children, do servidor) pelo animado em WebGL quando o rodapé chega
 * perto da tela. O WebGL só é baixado nessa hora, fora do JS inicial da página; com movimento
 * reduzido, ou se o WebGL 2 falhar, fica o de CSS.
 */
export function LiveHorizon({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setNear(true);
                observer.disconnect();
            },
            { rootMargin: "50%" },
        );
        observer.observe(ref.current!);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className="absolute inset-0">
            <div className={ready ? "hidden" : "contents"}>{children}</div>
            {near && (
                <Suspense>
                    <GradientAscii
                        colors={[
                            "--color-ink",
                            "--color-signal",
                            "--color-signal-deep",
                            "--color-ink",
                        ]}
                        // a parte amarela sobe mais que no original
                        lift={0.42}
                        glow={0.7}
                        gradientOpacity={1}
                        glyphOpacity={1}
                        onReady={() => setReady(true)}
                        className="absolute inset-0"
                    />
                </Suspense>
            )}
        </div>
    );
}
