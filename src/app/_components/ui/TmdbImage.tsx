import { cx } from "./cx";
import type { ImageSources } from "./tmdb-sources";

type TmdbImageProps = {
    /** endereços de tmdb-sources (backdropSources, thumbnailSources, posterSources) */
    sources: ImageSources;
    /** quanto a imagem ocupa na tela; sem ele, o srcSet usa densidade (1x, 2x) */
    sizes?: string;
    /** a imagem que aparece primeiro: carrega já e com prioridade */
    priority?: boolean;
    className?: string;
};

/**
 * Imagem de filme ou série servida direto pelo TMDB (RNF08), sem a otimização de imagens da
 * hospedagem. É decorativa: o título está sempre no texto ao lado.
 */
export function TmdbImage({ sources, sizes, priority, className }: TmdbImageProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element -- RNF08: nada de next/image aqui
        <img
            src={sources.src}
            srcSet={sources.srcSet}
            sizes={sizes}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className={cx("bg-frame object-cover object-focus", className)}
        />
    );
}
