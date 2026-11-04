import type { Feeling } from "@/domain/feelings";
import { LIMITED_MESSAGE } from "@/domain/rate-limit";
import { loadError } from "../StateScreen";

type HintInput = {
    failed: boolean;
    // a lista do contador foi recusada pelo limite (security.md §7)
    limited: boolean;
    drawFailed: boolean;
    count: number | null;
    feeling: Feeling | null;
};

/** O aviso embaixo do contador dos filtros; false quando não há nada a dizer. */
export function filtersHint({ failed, limited, drawFailed, count, feeling }: HintInput) {
    if (limited) return LIMITED_MESSAGE;
    if (failed || drawFailed) return `${loadError.heading}. Tente de novo.`;
    if (count !== 0) return false;
    return feeling === null
        ? "Tente baixar a nota ou marcar mais um streaming."
        : // US008 C5
          "Tente outro sentimento ou marque mais um streaming.";
}
