import type { ReactNode } from "react";

/** Simula o foco do teclado (o mesmo contorno do :focus-visible do globals.css). */
export const focusRing = "outline-2 outline-offset-3 outline-paper shadow-focus";

/** Ficha de um componente: nome e props em fonte de código, a função em uma frase. */
export function Spec({
    name,
    props,
    does,
    children,
}: {
    name: string;
    props: string[];
    does: string;
    children: ReactNode;
}) {
    return (
        <article
            aria-labelledby={`spec-${name}`}
            className="flex flex-col gap-6 border-t border-line pt-6"
        >
            <header className="flex flex-col gap-2">
                <h3 id={`spec-${name}`} className="text-body font-semibold">
                    <code>{name}</code>
                </h3>
                <p className="max-w-measure text-small text-soft">{does}</p>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-faint">
                    {props.map((prop) => (
                        <code key={prop}>{prop}</code>
                    ))}
                </p>
            </header>
            {children}
        </article>
    );
}

/** Uma linha de exemplos lado a lado, com o nome da linha em cima. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <span className="text-caption text-faint">{label}</span>
            <div className="flex flex-wrap items-center gap-3">{children}</div>
        </div>
    );
}

/** Estados lado a lado (normal, foco, desativado…), cada um com o nome em cima. */
export function States<S extends string>({
    states,
    render,
}: {
    states: readonly S[];
    render: (state: S) => ReactNode;
}) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {states.map((state) => (
                <div key={state} className="flex flex-col items-start gap-3">
                    <span className="text-caption text-faint">{state}</span>
                    {render(state)}
                </div>
            ))}
        </div>
    );
}

type Example = { note: string; example: ReactNode };

/**
 * Exemplo certo e errado, lado a lado. Os exemplos ficam inertes (fora do Tab e do leitor de
 * tela): quem explica é a legenda.
 */
export function DoDont({ use, avoid }: { use: Example; avoid: Example }) {
    return (
        <div className="grid gap-4 desktop:grid-cols-2">
            {[
                { label: "✓ Use", border: "border-paper", ...use },
                { label: "✕ Não use", border: "border-line-strong", ...avoid },
            ].map((item) => (
                <figure
                    key={item.label}
                    className={`flex min-w-0 flex-col gap-3 border-t pt-3 ${item.border}`}
                >
                    <figcaption className="text-data">
                        <b className="font-semibold">{item.label}</b>{" "}
                        <span className="text-soft">— {item.note}</span>
                    </figcaption>
                    <div
                        inert
                        className="flex min-h-28 flex-wrap items-center gap-3 overflow-hidden bg-frame p-4"
                    >
                        {item.example}
                    </div>
                </figure>
            ))}
        </div>
    );
}
