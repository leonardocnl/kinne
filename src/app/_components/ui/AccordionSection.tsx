"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronIcon } from "./icons";

type AccordionSectionProps = {
    title: string;
    /** o que está marcado, em texto; aparece no cabeçalho enquanto a seção está fechada */
    summary: string;
    children: ReactNode;
};

/**
 * Seção recolhível (padrão disclosure do WAI-ARIA): botão com aria-expanded e aria-controls.
 * Começa fechada e cada seção abre sozinha. O conteúdo fica montado, só escondido, para não perder
 * o que a pessoa digitou nele; não há animação de altura, então nada se move com movimento reduzido.
 */
export function AccordionSection({ title, summary, children }: AccordionSectionProps) {
    const id = useId();
    const [open, setOpen] = useState(false);

    return (
        <div className="border-t border-line">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-body`}
                onClick={() => setOpen(!open)}
                className="group flex min-h-target w-full cursor-pointer items-center justify-between gap-3 rounded-control border border-transparent px-3 py-1.5 text-left transition-colors duration-hover hover:border-line-strong hover:bg-hover motion-reduce:transition-none"
            >
                <span className="flex min-w-0 flex-col">
                    <span className="text-data text-soft">{title}</span>
                    {!open && <span className="truncate text-small text-paper">{summary}</span>}
                </span>
                <span className="shrink-0 transition-transform duration-hover group-aria-expanded:rotate-180 motion-reduce:transition-none">
                    <ChevronIcon />
                </span>
            </button>
            <div id={`${id}-body`} hidden={!open} className="px-1 pt-1 pb-3">
                {children}
            </div>
        </div>
    );
}
