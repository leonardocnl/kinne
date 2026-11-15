import type { ComponentProps } from "react";
import { cx } from "./cx";

/**
 * Linha de dados do título (gênero, ano, duração), separados por um fio. Todo dado tem o fio à
 * esquerda e a lista recua fio + respiro (o fio e o respiro somam 3.75) para escondê-lo: quando
 * quebra, a linha nova começa sem fio.
 */
export function Facts({ className, ...rest }: ComponentProps<"ul">) {
    return (
        <div className={cx("overflow-hidden", className)}>
            <ul
                className="-ml-3.75 flex flex-wrap items-center gap-y-1 text-body text-soft"
                {...rest}
            />
        </div>
    );
}

/** Um dado da linha. O primeiro, o gênero, vai em negrito. */
export function Fact({ className, ...rest }: ComponentProps<"li">) {
    return (
        <li
            className={cx("border-l border-line px-3.5 first:font-semibold", className)}
            {...rest}
        />
    );
}
