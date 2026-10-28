import { cx } from "./cx";
import { CheckIcon } from "./icons";
import { TmdbImage } from "./TmdbImage";
import { mosaicPosterSources } from "./tmdb-sources";

const ROWS = 3;

// os "votos": poucos pôsteres marcados, em posições fixas que não se repetem de fileira em fileira
const voted = (row: number, i: number) => (i * 5 + row * 4) % 9 === 0;

/**
 * Parede de pôsteres da entrada da sala: fileiras que deslizam devagar, alternando o sentido,
 * levemente inclinadas. A parede fica apagada e sem cor; poucos pôsteres, os "votados", ficam em
 * cor plena, com anel e selo amarelos. As bordas escurecem e o pé se funde com a página. Feita no
 * servidor, sem JS; só o transform anima (CSS), e com movimento reduzido fica parada.
 * Decorativa: ocupa a caixa de quem usa.
 */
export function PosterMosaic({ posters, className }: { posters: string[]; className?: string }) {
    if (posters.length === 0) return null;
    const perRow = Math.ceil(posters.length / ROWS);
    const rows = Array.from({ length: ROWS }, (_, r) =>
        posters.slice(r * perRow, (r + 1) * perRow),
    ).filter((row) => row.length > 0);
    return (
        <div aria-hidden="true" className={cx("pointer-events-none overflow-hidden", className)}>
            <div className="absolute inset-0 flex scale-110 -rotate-3 flex-col justify-center gap-5">
                {rows.map((row, r) => (
                    <div
                        key={r}
                        className={cx(
                            "flex w-max animate-mosaic gap-5 will-change-transform motion-reduce:animate-none",
                            r % 2 === 1 && "mosaic-reverse",
                        )}
                    >
                        {/* duas vezes a mesma fileira: a volta emenda sem corte */}
                        {[...row, ...row].map((path, i) => (
                            <div key={i} className="relative shrink-0">
                                {/* a parede fica apagada e sem cor; só os votados acendem, com o
                                    anel e o selo amarelos por cima, fora de qualquer véu */}
                                <TmdbImage
                                    sources={mosaicPosterSources(path)}
                                    className={cx(
                                        "aspect-2/3 w-40",
                                        voted(r, i % row.length)
                                            ? "shadow-glass ring-3 ring-signal"
                                            : "opacity-35 grayscale",
                                    )}
                                />
                                {voted(r, i % row.length) && (
                                    <span className="absolute -top-2.5 -right-2.5 flex size-8 items-center justify-center rounded-pill bg-signal text-ink shadow-glass">
                                        <CheckIcon />
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {/* bordas escurecidas e o pé fundido com a página: o centro fica aceso */}
            <div className="absolute inset-0 bg-mosaic-vignette" />
        </div>
    );
}
