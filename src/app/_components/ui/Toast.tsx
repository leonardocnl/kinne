import { cx } from "./cx";

/**
 * Aviso curto ("Anotado: você já viu Corra!"). Fica sempre na página, vazio e invisível, para
 * o leitor de tela anunciar quando o texto chega. A posição fica com quem usa.
 */
export function Toast({ message, className }: { message?: string; className?: string }) {
    return (
        <p
            role="status"
            className={cx(
                "w-max max-w-full rounded-card border border-line bg-toast px-3.5 py-2.5 text-data text-paper shadow-toast transition-opacity duration-fade empty:invisible empty:opacity-0 motion-reduce:transition-none",
                className,
            )}
        >
            {message}
        </p>
    );
}
