import type { ComponentProps } from "react";
import { cx } from "./cx";

const base =
    "inline-flex h-target cursor-pointer items-center rounded-pill border border-line bg-chip px-3.75 text-small text-soft transition-colors duration-hover motion-reduce:transition-none";

/** Chip de seleção múltipla: botão com aria-pressed. O marcado não muda no hover. */
export function Chip({
    pressed,
    className,
    type = "button",
    ...rest
}: ComponentProps<"button"> & { pressed: boolean }) {
    return (
        <button
            type={type}
            aria-pressed={pressed}
            className={cx(
                base,
                "not-aria-pressed:hover:border-line-strong not-aria-pressed:hover:bg-hover aria-pressed:border-paper aria-pressed:bg-paper aria-pressed:text-ink",
                className,
            )}
            {...rest}
        />
    );
}

/**
 * Chip de seleção única: rádio nativo (role="radio" implícito, setas do teclado de graça).
 * Agrupe com o mesmo `name` dentro de um elemento com role="radiogroup" e aria-labelledby.
 */
export function RadioChip({
    children,
    className,
    ...rest
}: Omit<ComponentProps<"input">, "type"> & { name: string }) {
    return (
        <label
            className={cx(
                base,
                "not-has-checked:hover:border-line-strong not-has-checked:hover:bg-hover has-checked:border-paper has-checked:bg-paper has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-paper",
                className,
            )}
        >
            <input type="radio" className="sr-only" {...rest} />
            {children}
        </label>
    );
}
