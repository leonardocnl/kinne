import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

const base =
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill whitespace-nowrap transition duration-hover active:scale-98 disabled:cursor-not-allowed disabled:opacity-disabled disabled:active:scale-100 motion-reduce:transition-none";

// hover de todos segue o do quiet; o primary não muda de cor no hover
const hover = "enabled:hover:border-line-strong enabled:hover:bg-hover";
const glass = "border border-line bg-quiet backdrop-blur-glass";

const variants = {
    primary: "h-control bg-signal px-5.5 text-body font-semibold text-ink",
    quiet: cx("h-control px-5.5 text-body font-medium", glass, hover),
    ghost: cx("h-control border border-line bg-ghost px-5 text-small font-medium", hover),
    round: cx("size-control", glass, hover),
};

// o dado de "Outra opção" gira um pouco no hover
const spin =
    "*:transition-transform *:duration-hover enabled:hover:*:-rotate-14 motion-reduce:*:transition-none";

type ButtonProps = ComponentProps<"button"> &
    (
        | {
              variant: "primary" | "quiet" | "ghost";
              /** ícone antes do texto, como em "Já vi" e "Trailer" */
              icon?: ReactNode;
              spinIcon?: never;
          }
        | {
              /** círculo só com o ícone (children); o nome vai em aria-label */
              variant: "round";
              "aria-label": string;
              /** o ícone gira um pouco no hover */
              spinIcon?: boolean;
              icon?: never;
          }
    );

export function Button({
    variant,
    icon,
    spinIcon,
    className,
    children,
    type = "button",
    ...rest
}: ButtonProps) {
    return (
        <button
            type={type}
            className={cx(
                base,
                variants[variant],
                icon !== undefined && "pr-5 pl-4",
                spinIcon && spin,
                className,
            )}
            {...rest}
        >
            {icon}
            {children}
        </button>
    );
}
