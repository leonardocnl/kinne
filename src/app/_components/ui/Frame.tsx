import type { ReactNode } from "react";
import { cx } from "./cx";
import { TmdbImage } from "./TmdbImage";
import { backdropSources, FRAME_SIZES } from "./tmdb-sources";

type FrameProps = {
    /** escurece a imagem de cima a baixo, para a nota e o trailer ficarem legíveis */
    bottomShade?: boolean;
    /** imagens (FrameImage) e conteúdo sobreposto (nota, trailer, voltar) */
    children?: ReactNode;
    className?: string;
};

/**
 * Quadro da imagem: cantos retos, 2.39:1 no computador e 16:9 no celular (de ponta a ponta da
 * tela), com grão (e gradiente, com bottomShade) por cima da imagem.
 */
export function Frame({ bottomShade, children, className }: FrameProps) {
    return (
        <div
            className={cx(
                "relative isolate aspect-video overflow-hidden bg-frame max-desktop:-mx-gutter desktop:aspect-scope",
                className,
            )}
        >
            {bottomShade && (
                <div aria-hidden="true" className="absolute inset-0 -z-2 bg-shade-full" />
            )}
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
    /** largura do original no TMDB; sem ela, o srcset fica nos tamanhos fixos */
    width: number | null;
    /** com várias imagens no quadro, só a visível aparece; a troca dissolve */
    visible?: boolean;
    priority?: boolean;
};

/** Imagem do TMDB que preenche o quadro, por baixo do gradiente e do grão. */
export function FrameImage({ path, width, visible = true, priority }: FrameImageProps) {
    return (
        <TmdbImage
            sources={backdropSources(path, width)}
            sizes={FRAME_SIZES}
            priority={priority}
            className={cx(
                "absolute inset-0 -z-3 size-full transition-opacity duration-dissolve motion-reduce:transition-none",
                !visible && "opacity-0",
            )}
        />
    );
}
