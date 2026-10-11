import { Frame } from "./Frame";
import { cx } from "./cx";

/** Cada forma imita o que vai substituir: imagem reta, botão e linhas em pílula. */
const shapes = {
    title: "h-skeleton-title rounded-card",
    line: "h-3.5 rounded-pill",
    data: "h-3 w-16 rounded-pill",
    button: "h-control rounded-pill",
};

const pulse = "animate-breathe motion-reduce:animate-none";

type SkeletonProps = {
    shape: keyof typeof shapes | "frame" | "count";
    /** largura, para title, line e button */
    className?: string;
};

/** Bloco de carregamento que pulsa em claridade; parado com movimento reduzido. */
export function Skeleton({ shape, className }: SkeletonProps) {
    // número do contador: uma pílula por célula de algarismo, na altura dos algarismos
    if (shape === "count") {
        return (
            <span aria-hidden="true" className={cx("inline-flex text-count", className)}>
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="flex w-digit justify-center">
                        <span className={cx("h-6.5 w-4/5 rounded-pill bg-quiet", pulse)} />
                    </span>
                ))}
            </span>
        );
    }
    if (shape === "frame") {
        return (
            <Frame className={cx("bg-skeleton", className)}>
                <span aria-hidden="true" className={cx("absolute inset-0 -z-2 bg-ghost", pulse)} />
            </Frame>
        );
    }
    return (
        <span
            aria-hidden="true"
            className={cx("block bg-quiet", shapes[shape], pulse, className)}
        />
    );
}
