import type { ComponentProps } from "react";
import { cx } from "./cx";

/**
 * Painel de vidro dos filtros. No computador flutua com cantos de painel; no celular ocupa a
 * tela, sem cantos nem borda, com tinta mais forte. Posição e tamanho ficam com quem usa.
 */
export function GlassPanel({ className, ...rest }: ComponentProps<"div">) {
    return (
        <div
            className={cx(
                "flex flex-col gap-3.5 rounded-panel border border-line bg-glass bg-linear-to-b from-scrim to-scrim p-panel shadow-glass backdrop-blur-glass backdrop-saturate-glass",
                "max-desktop:rounded-none max-desktop:border-0 max-desktop:from-scrim-strong max-desktop:to-scrim-strong max-desktop:px-4 max-desktop:pt-5.5",
                className,
            )}
            {...rest}
        />
    );
}
