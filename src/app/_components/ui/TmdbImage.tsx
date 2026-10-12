import { cx } from "./cx";

const BASE_URL = "https://image.tmdb.org/t/p/";

type Width = "w92" | "w300" | "w780" | "w1280";

type TmdbImageProps = {
    /** caminho guardado no banco, como "/abc.jpg" */
    path: string;
    /** tamanhos do TMDB oferecidos no srcset, do menor ao maior */
    widths: [Width, ...Width[]];
    /** a imagem que aparece primeiro: carrega já e com prioridade */
    priority?: boolean;
    className?: string;
};

const url = (width: Width, path: string) => `${BASE_URL}${width}${path}`;

/**
 * Imagem de filme ou série servida direto pelo TMDB (RNF08), sem a otimização de imagens da
 * hospedagem. É decorativa: o título está sempre no texto ao lado.
 */
export function TmdbImage({ path, widths, priority, className }: TmdbImageProps) {
    return (
        // eslint-disable-next-line @next/next/no-img-element -- RNF08: nada de next/image aqui
        <img
            src={url(widths.at(-1)!, path)}
            srcSet={widths.map((w) => `${url(w, path)} ${w.slice(1)}w`).join(", ")}
            sizes="100vw"
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className={cx("bg-frame object-cover object-focus", className)}
        />
    );
}
