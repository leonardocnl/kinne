import type { ComponentProps } from "react";
import { cx } from "./cx";

/** O vidro do painel (borda, tinta, sombra e desfoque), sem layout: o cartão do rodapé também usa. */
export const glassSurface =
    "rounded-panel border border-line bg-glass bg-linear-to-b from-scrim to-scrim shadow-glass backdrop-blur-glass backdrop-saturate-glass";

/**
 * Painel de vidro dos filtros. No computador flutua com cantos de painel; no celular ocupa a
 * tela, sem cantos nem borda, com tinta mais forte. Posição e tamanho ficam com quem usa.
 */
export function GlassPanel({ className, ...rest }: ComponentProps<"div">) {
    return (
        <div
            className={cx(
                glassSurface,
                "flex flex-col gap-3.5 p-panel",
                "max-desktop:rounded-none max-desktop:border-0 max-desktop:from-scrim-strong max-desktop:to-scrim-strong max-desktop:px-4 max-desktop:pt-5.5",
                className,
            )}
            {...rest}
        />
    );
}
