import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

const base =
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill whitespace-nowrap transition duration-hover active:scale-98 disabled:cursor-not-allowed disabled:opacity-disabled disabled:active:scale-100 motion-reduce:transition-none";

// hover de todos segue o do quiet; o primary não muda de cor no hover. not-disabled, e não
// enabled, porque :enabled não vale para links.
const hover = "not-disabled:hover:border-line-strong not-disabled:hover:bg-hover";
const glass = "border border-line bg-quiet backdrop-blur-glass";

const variants = {
    primary: "h-control bg-signal px-5.5 text-body font-semibold text-ink",
    quiet: cx("h-control px-5.5 text-body font-medium", glass, hover),
    ghost: cx("h-control border border-line bg-ghost px-5 text-small font-medium", hover),
    round: cx("size-control", glass, hover),
    // pequeno sobre a imagem; o ::before estende o alvo de toque até h-target
    overlay: cx(
        "relative size-overlay border border-line bg-veil backdrop-blur-veil before:absolute before:-inset-1.5",
        hover,
    ),
};

// o dado de "Outra opção" gira um pouco no hover
const spin =
    "*:transition-transform *:duration-hover not-disabled:hover:*:-rotate-14 motion-reduce:*:transition-none";

type Look =
    | {
          variant: "primary" | "quiet" | "ghost";
          /** ícone antes do texto, como em "Já vi" e "Trailer" */
          icon?: ReactNode;
          spinIcon?: never;
      }
    | {
          /** círculo só com o ícone (children); o nome vai em aria-label */
          variant: "round" | "overlay";
          "aria-label": string;
          /** o ícone gira um pouco no hover */
          spinIcon?: boolean;
          icon?: never;
      };

const look = (
    variant: Look["variant"],
    icon: ReactNode,
    spinIcon: boolean | undefined,
    className: string | undefined,
) => cx(base, variants[variant], icon !== undefined && "pr-5 pl-4", spinIcon && spin, className);

export function Button({
    variant,
    icon,
    spinIcon,
    className,
    children,
    type = "button",
    ...rest
}: ComponentProps<"button"> & Look) {
    return (
        <button type={type} className={look(variant, icon, spinIcon, className)} {...rest}>
            {icon}
            {children}
        </button>
    );
}

/** Link com cara de botão, para o que leva a outra página: "Voltar ao início", "Trailer". */
export function ButtonLink({
    variant,
    icon,
    spinIcon,
    className,
    children,
    ...rest
}: ComponentProps<typeof Link> & Look) {
    return (
        <Link className={look(variant, icon, spinIcon, className)} {...rest}>
            {icon}
            {children}
        </Link>
    );
}
