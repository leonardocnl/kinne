import type { ReactNode } from "react";
import { cx } from "./cx";
import { TmdbImage } from "./TmdbImage";

type FrameProps = {
    /** escurece também a base, para a nota e o trailer ficarem legíveis */
    bottomShade?: boolean;
    /** imagens (FrameImage) e conteúdo sobreposto (nota, trailer, voltar) */
    children?: ReactNode;
    className?: string;
};

/**
 * Quadro da imagem: cantos retos, 2.39:1 no computador e 16:9 no celular (de ponta a ponta da
 * tela), com gradiente e grão por cima da imagem.
 */
export function Frame({ bottomShade, children, className }: FrameProps) {
    return (
        <div
            className={cx(
                "relative isolate aspect-video overflow-hidden bg-frame max-desktop:-mx-gutter desktop:aspect-scope",
                className,
            )}
        >
            <div
                aria-hidden="true"
                className={cx(
                    "absolute inset-0 -z-2",
                    bottomShade ? "bg-shade-full" : "bg-shade-top",
                )}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-1 bg-grain opacity-grain mix-blend-overlay"
            />
            {children}
        </div>
    );
}

type FrameImageProps = {
    path: string;
    /** com várias imagens no quadro, só a visível aparece; a troca dissolve */
    visible?: boolean;
    priority?: boolean;
};

/** Imagem do TMDB que preenche o quadro, por baixo do gradiente e do grão. */
export function FrameImage({ path, visible = true, priority }: FrameImageProps) {
    return (
        <TmdbImage
            path={path}
            widths={["w780", "w1280"]}
            priority={priority}
            className={cx(
                "absolute inset-0 -z-3 size-full transition-opacity duration-dissolve motion-reduce:transition-none",
                !visible && "opacity-0",
            )}
        />
    );
}
