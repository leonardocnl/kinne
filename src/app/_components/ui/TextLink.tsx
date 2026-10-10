import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

const style =
    "inline-flex h-target cursor-pointer items-center gap-1 self-start text-small font-medium text-paper underline decoration-line underline-offset-5 transition-colors duration-hover hover:decoration-paper motion-reduce:transition-none";

/** Link sublinhado ("Ver este título →"). Sem href, vira botão ("Ler mais"). */
type TextLinkProps =
    ComponentProps<typeof Link> | (ComponentProps<"button"> & { href?: undefined });

export function TextLink(props: TextLinkProps) {
    if (props.href !== undefined) {
        return <Link {...props} className={cx(style, props.className)} />;
    }
    const { type = "button", ...rest } = props;
    return <button type={type} {...rest} className={cx(style, props.className)} />;
}
