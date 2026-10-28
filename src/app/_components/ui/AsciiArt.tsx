"use client";

import { type ComponentProps, lazy, Suspense } from "react";

// O not-found da raiz entra no JS de toda página: o efeito (AsciiType) só baixa quando a tela
// sem título aparece, fora do JS inicial.
const AsciiType = lazy(() => import("./AsciiType"));

/** O AsciiType carregado sob demanda; até chegar, o quadro fica vazio. */
export function AsciiArt(props: ComponentProps<typeof AsciiType>) {
    return (
        <Suspense>
            <AsciiType {...props} />
        </Suspense>
    );
}
