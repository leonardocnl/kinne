// Streamings por assinatura suportados no Brasil.
export const STREAMINGS = ["netflix", "max", "prime-video", "disney-plus", "globoplay"] as const;

export type Streaming = (typeof STREAMINGS)[number];

export function isStreaming(value: string): value is Streaming {
    return (STREAMINGS as readonly string[]).includes(value);
}

// Códigos dos streamings no TMDB (região BR), na ordem de preferência para exibir um só.
export const STREAMING_SERVICES = [
    { name: "Netflix", tmdbId: 8, preposition: "na" },
    { name: "Max", tmdbId: 1899, preposition: "no" },
    { name: "Prime Video", tmdbId: 119, preposition: "no" },
    { name: "Disney+", tmdbId: 337, preposition: "no" },
    { name: "Globoplay", tmdbId: 307, preposition: "no" },
] as const;

export type StreamingService = (typeof STREAMING_SERVICES)[number];

// O primeiro, na ordem acima, entre os streamings em que o título está.
export function primaryStreaming(tmdbIds: readonly number[]): StreamingService | null {
    return STREAMING_SERVICES.find((s) => tmdbIds.includes(s.tmdbId)) ?? null;
}
