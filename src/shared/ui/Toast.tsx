import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Aviso curto ("Anotado: você já viu Corra!"), com ações opcionais ao lado ("Curtiu?" 👍 👎).
 * Fica sempre na página, vazio e invisível, para o leitor de tela anunciar quando o texto chega.
 * A posição fica com quem usa.
 */
export function Toast({
    message,
    children,
    className,
}: {
    message?: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            role="status"
            className={cx(
                "flex w-max max-w-full items-center gap-3 rounded-card border border-line bg-toast px-3.5 py-2.5 text-data text-paper shadow-toast transition-opacity duration-fade empty:invisible empty:opacity-0 motion-reduce:transition-none",
                className,
            )}
        >
            {message}
            {children}
        </div>
    );
}
