import { RUNTIME_LIMITS, type Filters, type TypeChoice } from "@/domain/filters";
import { GENRE_LABELS, KINNE_GENRES } from "@/domain/genre";
import { STREAMING_SERVICES } from "@/domain/streaming";

export const TYPES: { value: TypeChoice; label: string }[] = [
    { value: "movie", label: "Filmes" },
    { value: "series", label: "Séries" },
    { value: "both", label: "Os dois" },
];

/**
 * O que cada seção do painel mostra no cabeçalho fechado, lido dos mesmos filtros que o painel
 * edita. Nenhum marcado em streamings ou gêneros vale como todos (RNG003, US002 RNE001).
 */
export function summarize(filters: Filters) {
    const names = (list: string[]) => (list.length > 0 ? list.join(", ") : "Qualquer");
    return {
        streamings: names(
            STREAMING_SERVICES.filter((s) => filters.streamings.includes(s.id)).map((s) => s.name),
        ),
        type: TYPES.find((t) => t.value === filters.type)?.label ?? "",
        genres: names(
            KINNE_GENRES.filter((g) => filters.genres.includes(g)).map((g) => GENRE_LABELS[g]),
        ),
        rating: filters.adult ? "Com 18+" : "Sem 18+",
        person: filters.person?.name ?? "Nenhum",
        minRating: filters.minRating.toFixed(1).replace(".", ","),
        runtime: RUNTIME_LIMITS.find((l) => l.minutes === filters.maxRuntime)?.label ?? "",
    };
}
