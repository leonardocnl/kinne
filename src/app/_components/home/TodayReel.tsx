import { useId } from "react";
import type { HomePick } from "../../_data/home";
import { TmdbImage } from "../ui/TmdbImage";

type TodayReelProps = {
    picks: HomePick[];
    current: number;
    onSelect: (index: number) => void;
};

/** Faixa "Hoje" com as cinco indicações (US001 C5). No celular, rola na horizontal. */
export function TodayReel({ picks, current, onSelect }: TodayReelProps) {
    const reelHeading = useId();
    return (
        <section
            aria-labelledby={reelHeading}
            className="mt-3.5 flex flex-col gap-3.5 border-t border-line pt-4 max-desktop:mt-4.5"
        >
            <header className="flex items-baseline gap-3.5">
                <h2 id={reelHeading} className="font-display text-reel font-medium">
                    Hoje
                </h2>
                <span className="text-caption text-faint">cinco indicações</span>
            </header>
            <ul className="grid grid-cols-5 gap-4 max-desktop:scrollbar-none max-desktop:flex max-desktop:gap-3 max-desktop:overflow-x-auto max-desktop:pb-2">
                {picks.map((p, i) => (
                    <li
                        key={p.slug}
                        className="min-w-0 max-desktop:flex-none max-desktop:basis-37.5"
                    >
                        <button
                            type="button"
                            aria-pressed={i === current}
                            onClick={() => onSelect(i)}
                            className="group flex w-full cursor-pointer flex-col gap-2.25 text-left"
                        >
                            <span className="h-0.5 bg-rail group-aria-pressed:bg-paper" />
                            {p.backdropImagePath ? (
                                <TmdbImage
                                    path={p.backdropImagePath}
                                    widths={["w300"]}
                                    className="aspect-scope w-full opacity-50 transition-opacity duration-fade group-hover:opacity-80 group-aria-pressed:opacity-100 motion-reduce:transition-none"
                                />
                            ) : (
                                <span className="aspect-scope bg-frame" />
                            )}
                            <span className="flex min-w-0 flex-col">
                                <small className="text-caption text-faint">{p.genre}</small>
                                <strong className="line-clamp-2 pb-0.75 font-display text-shot font-medium text-soft group-aria-pressed:text-paper">
                                    {p.title}
                                </strong>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
