import { cx } from "./cx";
import { TmdbImage } from "./TmdbImage";
import { posterSources } from "./tmdb-sources";

type Service = { id: string; name: string; logoPath?: string | null };

/**
 * Onde assistir em logos (tela do título): cada streaming com o logo e o nome embaixo. É texto,
 * não controle. Sem logo, só o nome; sem streaming, nada.
 */
export function AvailabilityLogos({
    streamings,
    className,
}: {
    streamings: readonly Service[];
    className?: string;
}) {
    if (streamings.length === 0) return null;
    return (
        <div className={cx("flex flex-col gap-2 desktop:items-end", className)}>
            <p className="text-caption text-soft">Onde assistir</p>
            <ul className="flex flex-wrap gap-x-2 gap-y-3 desktop:justify-end">
                {streamings.map((s) => (
                    <li key={s.id} className="flex w-16 flex-col items-center gap-1.5">
                        {/* o logo é decorativo: o nome está logo abaixo, em texto */}
                        {s.logoPath && (
                            <TmdbImage
                                sources={posterSources(s.logoPath)}
                                className="size-logo rounded-card"
                            />
                        )}
                        <span className="text-center text-caption text-balance text-paper">
                            {s.name}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
