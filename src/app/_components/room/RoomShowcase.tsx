import { GENRE_LABELS } from "@/domain/genre";
import { cx } from "../ui/cx";
import { CheckIcon } from "../ui/icons";
import { TmdbImage } from "../ui/TmdbImage";
import { largePosterSources } from "../ui/tmdb-sources";

// o que cada pessoa marcou no exemplo (US011 C5): os gêneros que ela topa
const PEOPLE = [
    { name: "Ana", genres: ["comedy", "drama", "romance"], marked: ["comedy", "romance"] },
    { name: "Bruno", genres: ["action", "comedy", "suspense"], marked: ["comedy", "suspense"] },
] as const;

const phone = "flex shrink-0 flex-col rounded-panel border border-line bg-frame shadow-glass";

function Person({ name, genres, marked }: (typeof PEOPLE)[number]) {
    return (
        <div className={cx(phone, "aspect-9/16 w-64 gap-4 p-panel")}>
            <p className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-pill bg-quiet text-small font-semibold text-paper">
                    {name[0]}
                </span>
                <span className="text-small font-medium text-paper">{name}</span>
            </p>
            <p className="text-caption font-semibold tracking-code text-soft uppercase">Topa ver</p>
            <ul className="flex flex-wrap gap-2">
                {genres.map((g) => {
                    const on = (marked as readonly string[]).includes(g);
                    return (
                        <li
                            key={g}
                            className={cx(
                                "inline-flex h-8 items-center rounded-pill border px-3 text-data",
                                on
                                    ? "border-paper bg-paper text-ink"
                                    : "border-line bg-chip text-soft",
                            )}
                        >
                            {GENRE_LABELS[g]}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/**
 * O quadro da entrada da sala mostra a sala funcionando: dois celulares de vidro com o que cada
 * pessoa marcou e, no meio, mais à frente, a escolha do grupo, com o pôster de um título real do
 * catálogo. Decorativo (aria-hidden), feito no servidor. No celular, só a escolha do grupo.
 */
export function RoomShowcase({ pick }: { pick: { title: string; poster: string } | null }) {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center gap-10"
        >
            <div className="translate-y-6 -rotate-6 max-desktop:hidden">
                <Person {...PEOPLE[0]} />
            </div>
            <div className={cx(phone, "z-1 aspect-9/16 w-76 gap-3 border-signal p-panel")}>
                <p className="flex items-center gap-2 text-caption font-semibold tracking-code text-signal uppercase">
                    <CheckIcon />
                    Escolha do grupo
                </p>
                {pick && (
                    <TmdbImage
                        sources={largePosterSources(pick.poster)}
                        sizes="19rem"
                        priority
                        className="aspect-2/3 w-full"
                    />
                )}
                <p className="font-display text-confirm font-medium text-paper">
                    {pick?.title ?? "O filme da noite"}
                </p>
            </div>
            <div className="translate-y-6 rotate-6 max-desktop:hidden">
                <Person {...PEOPLE[1]} />
            </div>
        </div>
    );
}
