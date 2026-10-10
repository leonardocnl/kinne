import Image from "next/image";
import { cx } from "./cx";

/** A marca do Kinne (amarela, como o controle principal). */
export function Wordmark({ className }: { className?: string }) {
    return (
        <Image
            src="/wordmark.svg"
            alt="kinne"
            width={96}
            height={36}
            className={cx("h-9 w-auto max-desktop:h-7.5", className)}
        />
    );
}
