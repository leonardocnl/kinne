"use client";

import { lazy, Suspense } from "react";

// O not-found da raiz entra no JS de toda página: o efeito (AsciiType) só baixa quando a tela
// sem título aparece, fora do JS inicial.
const AsciiType = lazy(() => import("./AsciiType"));

/** O AsciiType carregado sob demanda; até chegar, o quadro fica vazio. */
export function AsciiArt(props: { text: string; className?: string }) {
    return (
        <Suspense>
            <AsciiType {...props} />
        </Suspense>
    );
}
