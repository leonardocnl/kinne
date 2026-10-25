"use client";

import type { ReactNode, Ref } from "react";
import { cx } from "./cx";
import { CloseIcon } from "./icons";

/**
 * Escolha que se tira com um toque (a pessoa nos filtros): marcada como o chip marcado, com o
 * botão de remover na ponta direita, do tamanho do alvo de toque e concêntrico à pílula.
 */
export function RemovableChip({
    children,
    removeLabel,
    onRemove,
    removeRef,
    className,
}: {
    children: ReactNode;
    /** nome do botão para leitores de tela, como "Remover Tom Hanks" */
    removeLabel: string;
    onRemove: () => void;
    removeRef?: Ref<HTMLButtonElement>;
    className?: string;
}) {
    return (
        <span
            className={cx(
                "inline-flex h-target max-w-full items-center gap-1 rounded-pill bg-paper pl-3.75 text-small text-ink",
                className,
            )}
        >
            <span className="min-w-0 truncate">{children}</span>
            <button
                ref={removeRef}
                type="button"
                aria-label={removeLabel}
                title={removeLabel}
                onClick={onRemove}
                className="inline-flex size-target shrink-0 cursor-pointer items-center justify-center rounded-pill transition-colors duration-hover hover:bg-ink/10 motion-reduce:transition-none"
            >
                <CloseIcon />
            </button>
        </span>
    );
}
