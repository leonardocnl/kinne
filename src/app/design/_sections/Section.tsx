import type { ReactNode } from "react";

export const sections = [
    { id: "cores", title: "Cores" },
    { id: "tipografia", title: "Tipografia" },
    { id: "espaco", title: "Espaço" },
    { id: "forma", title: "Forma" },
    { id: "movimento", title: "Movimento" },
    { id: "componentes", title: "Componentes" },
    { id: "regras", title: "Regras" },
] as const;

export const sectionNumber = (index: number) => String(index + 1).padStart(2, "0");

export const display = "font-display font-medium";

/** Seção numerada: número, título, uma frase do que resolve e o conteúdo. */
export function Section({
    id,
    lead,
    children,
}: {
    id: (typeof sections)[number]["id"];
    lead: string;
    children: ReactNode;
}) {
    const index = sections.findIndex((section) => section.id === id);
    return (
        <section
            id={id}
            aria-labelledby={`${id}-title`}
            className="flex scroll-mt-6 flex-col gap-10 border-t border-line pt-8"
        >
            <header className="flex flex-col gap-3">
                <span className={`${display} text-count text-faint`}>{sectionNumber(index)}</span>
                <h2 id={`${id}-title`} className={`${display} text-heading`}>
                    {sections[index].title}
                </h2>
                <p className="max-w-measure text-tagline text-soft">{lead}</p>
            </header>
            {children}
        </section>
    );
}

/** Duas colunas no computador: explicação à esquerda, exemplos à direita. */
export function Split({ aside, children }: { aside: ReactNode; children: ReactNode }) {
    return (
        <div className="grid gap-6 desktop:grid-cols-10 desktop:gap-10">
            <div className="flex flex-col gap-3 text-small text-soft desktop:col-span-3">
                {aside}
            </div>
            <div className="flex min-w-0 flex-col gap-8 desktop:col-span-7">{children}</div>
        </div>
    );
}

/** Subtítulo dentro de uma seção (h3). */
export function Subhead({ children }: { children: ReactNode }) {
    return <h3 className={`${display} text-reel`}>{children}</h3>;
}
