// Streamings por assinatura suportados no Brasil.
export const STREAMINGS = ["netflix", "max", "prime-video", "disney-plus", "globoplay"] as const;

export type Streaming = (typeof STREAMINGS)[number];

export function isStreaming(value: string): value is Streaming {
    return (STREAMINGS as readonly string[]).includes(value);
}

// Códigos dos streamings no TMDB (região BR).
export const STREAMING_SERVICES = [
    { name: "Netflix", tmdbId: 8 },
    { name: "Max", tmdbId: 1899 },
    { name: "Prime Video", tmdbId: 119 },
    { name: "Disney+", tmdbId: 337 },
    { name: "Globoplay", tmdbId: 307 },
] as const;
