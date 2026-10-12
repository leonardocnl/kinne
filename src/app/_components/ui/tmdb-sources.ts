// Endereços das imagens do TMDB (RNF08): direto do image.tmdb.org, sem a otimização da hospedagem.

export const TMDB_IMAGE_ORIGIN = "https://image.tmdb.org";

export type ImageSources = { src: string; srcSet: string };

const url = (size: string, path: string) => `${TMDB_IMAGE_ORIGIN}/t/p/${size}${path}`;

// Tamanhos fixos que o TMDB serve para imagens largas, do menor ao maior.
const BACKDROP_STEPS = [780, 1280] as const;

/**
 * Imagem larga do quadro: w780 e w1280, mais o original com a largura real (guardada pela carga).
 * Só entram os passos menores que o original, que o TMDB não amplia. Sem a largura, o original
 * fica de fora, porque um srcset sem o tamanho certo faria o navegador baixar errado.
 */
export function backdropSources(path: string, width: number | null): ImageSources {
    const steps = BACKDROP_STEPS.filter((w) => width === null || w < width);
    const candidates = steps.map((w) => `${url(`w${w}`, path)} ${w}w`);
    if (width !== null) candidates.push(`${url("original", path)} ${width}w`);
    const largest = width !== null ? url("original", path) : url("w1280", path);
    return { src: largest, srcSet: candidates.join(", ") };
}

/** Miniatura de imagem larga (faixa "Hoje"): w300 e w780 bastam até telas 2x. */
export function thumbnailSources(path: string): ImageSources {
    return {
        src: url("w300", path),
        srcSet: `${url("w300", path)} 300w, ${url("w780", path)} 780w`,
    };
}

/** Pôster pequeno (busca): w92 na tela comum e w185 nas telas 2x. */
export function posterSources(path: string): ImageSources {
    return { src: url("w92", path), srcSet: `${url("w92", path)} 1x, ${url("w185", path)} 2x` };
}

// Medidas em rem (16 por rem), como o breakpoint do globals.css: 53.8125rem é o desktop (861).
const DESKTOP = "(min-width: 53.8125rem)";

// Quanto o quadro ocupa: a página menos as margens no computador; a tela toda no celular.
export const FRAME_SIZES = `${DESKTOP} calc(100vw - 5rem), 100vw`;

// Miniatura da faixa "Hoje": um quinto da página no computador, basis-37.5 no celular.
export const THUMBNAIL_SIZES = `${DESKTOP} 20vw, 9.375rem`;
