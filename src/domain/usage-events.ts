// Eventos da medição da semana 0 (03, Eventos), sem nada que identifique a pessoa (RNF09).

export const EVENT_NAMES = [
    "app_opened",
    "recommendation_shown",
    "will_watch_clicked",
    "already_watched_clicked",
    "another_option_clicked",
    "trailer_opened",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const RECOMMENDATION_SOURCES = ["daily_pick", "filtered", "surprise_me"] as const;

export type RecommendationSource = (typeof RECOMMENDATION_SOURCES)[number];

export type UsageEvent = {
    // código aleatório do navegador (RNG005)
    browserId: string;
    name: EventName;
    // só em recommendation_shown; vazio quando o título abriu por link
    source: RecommendationSource | null;
    titleId: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isBrowserId = (value: unknown): value is string =>
    typeof value === "string" && UUID.test(value);

/** O evento vem do navegador: só passa no formato esperado. Qualquer coisa fora disso é null. */
export function parseUsageEvent(value: unknown): UsageEvent | null {
    if (typeof value !== "object" || value === null) return null;
    const { browserId, name, source, titleId } = value as Record<string, unknown>;
    const ok =
        isBrowserId(browserId) &&
        EVENT_NAMES.includes(name as EventName) &&
        (source === null ||
            (name === "recommendation_shown" &&
                RECOMMENDATION_SOURCES.includes(source as RecommendationSource))) &&
        (titleId === null || (Number.isSafeInteger(titleId) && (titleId as number) > 0));
    if (!ok) return null;
    return {
        browserId: browserId.toLowerCase(),
        name: name as EventName,
        source: source as RecommendationSource | null,
        titleId: titleId as number | null,
    };
}
