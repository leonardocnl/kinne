// Streamings por assinatura suportados no Brasil (RNG002), com o código no TMDB (região BR), na
// ordem de preferência para exibir um só. O id é o que o navegador guarda (RNG005).
export const STREAMING_SERVICES = [
    { id: "netflix", name: "Netflix", tmdbId: 8, preposition: "na" },
    { id: "max", name: "Max", tmdbId: 1899, preposition: "no" },
    { id: "prime-video", name: "Prime Video", tmdbId: 119, preposition: "no" },
    { id: "disney-plus", name: "Disney+", tmdbId: 337, preposition: "no" },
    { id: "globoplay", name: "Globoplay", tmdbId: 307, preposition: "no" },
] as const;

export type StreamingService = (typeof STREAMING_SERVICES)[number];

export type Streaming = StreamingService["id"];

export function isStreaming(value: string): value is Streaming {
    return STREAMING_SERVICES.some((s) => s.id === value);
}

// O primeiro, na ordem acima, entre os streamings em que o título está.
export function primaryStreaming(tmdbIds: readonly number[]): StreamingService | null {
    return STREAMING_SERVICES.find((s) => tmdbIds.includes(s.tmdbId)) ?? null;
}
