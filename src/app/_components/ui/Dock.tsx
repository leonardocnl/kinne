import type { ComponentProps } from "react";
import { cx } from "./cx";

type DockProps = ComponentProps<"div"> & {
    /** barra mais alta, com texto acima do botão ("Combinado") */
    tall?: boolean;
};

/**
 * Ações presas à base da tela no celular, acima da área segura do aparelho; no computador ficam
 * no lugar. Enquanto existe, a página ganha espaço embaixo e scroll-padding, para a barra nunca
 * esconder o rodapé nem o elemento em foco (WCAG 2.4.11): veja [data-dock] no globals.css.
 */
export function Dock({ tall, className, ...rest }: DockProps) {
    return (
        <div
            data-dock={tall ? "tall" : ""}
            className={cx(
                "max-desktop:fixed max-desktop:inset-x-0 max-desktop:bottom-0 max-desktop:z-10 max-desktop:bg-dock max-desktop:px-gutter max-desktop:pt-7 max-desktop:pb-safe",
                className,
            )}
            {...rest}
        />
    );
}
