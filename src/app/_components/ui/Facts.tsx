import type { ComponentProps } from "react";
import { cx } from "./cx";

/** Linha de dados do título (gênero, ano, duração), separados por um fio. */
export function Facts({ className, ...rest }: ComponentProps<"ul">) {
    return (
        <ul
            className={cx("flex flex-wrap items-center gap-y-1 text-small text-soft", className)}
            {...rest}
        />
    );
}

/** Um dado da linha. O primeiro, o gênero, vai em negrito e sem fio. */
export function Fact({ className, ...rest }: ComponentProps<"li">) {
    return (
        <li
            className={cx(
                "border-l border-line px-3.5 first:border-l-0 first:pl-0 first:font-semibold",
                className,
            )}
            {...rest}
        />
    );
}
