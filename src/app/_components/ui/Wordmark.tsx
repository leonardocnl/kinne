import { cx } from "./cx";

/** A marca do Kinne (amarela, como o controle principal). */
export function Wordmark({ className }: { className?: string }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element -- SVG estático: o next/image só somaria JS
        <img
            src="/wordmark.svg"
            alt="kinne"
            width={96}
            height={36}
            decoding="async"
            className={cx("h-9 w-auto max-desktop:h-7.5", className)}
        />
    );
}
