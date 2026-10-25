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

export const RECOMMENDATION_SOURCES = ["daily_pick", "filtered", "surprise_me", "search"] as const;

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
