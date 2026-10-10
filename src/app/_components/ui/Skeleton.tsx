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
    shape: keyof typeof shapes | "frame";
    /** largura, para title, line e button */
    className?: string;
};

/** Bloco de carregamento que pulsa em claridade; parado com movimento reduzido. */
export function Skeleton({ shape, className }: SkeletonProps) {
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
