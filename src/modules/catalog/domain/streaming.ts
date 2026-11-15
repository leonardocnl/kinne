// Streamings por assinatura suportados no Brasil (RNG002), com o código no TMDB (região BR). O id é o que o navegador guarda (RNG005).
export const STREAMING_SERVICES = [
    { id: "netflix", name: "Netflix", tmdbId: 8 },
    { id: "max", name: "Max", tmdbId: 1899 },
    { id: "prime-video", name: "Prime Video", tmdbId: 119 },
    { id: "disney-plus", name: "Disney+", tmdbId: 337 },
    { id: "globoplay", name: "Globoplay", tmdbId: 307 },
] as const;

export type StreamingService = (typeof STREAMING_SERVICES)[number];

export type Streaming = StreamingService["id"];

export function isStreaming(value: string): value is Streaming {
    return STREAMING_SERVICES.some((s) => s.id === value);
}

// Os códigos no TMDB dos streamings marcados; nenhum marcado vale como todos (RNG003).
export function streamingTmdbIds(streamings: readonly Streaming[]): number[] {
    return STREAMING_SERVICES.filter(
        (s) => streamings.length === 0 || streamings.includes(s.id),
    ).map((s) => s.tmdbId);
}

// Os streamings em que o título está, na ordem acima.
export function availableStreamings(tmdbIds: readonly number[]): StreamingService[] {
    return STREAMING_SERVICES.filter((s) => tmdbIds.includes(s.tmdbId));
}

const LIST = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });

// "Netflix", "Netflix e Max", "Netflix, Max e Prime Video".
export function streamingList(services: readonly Pick<StreamingService, "name">[]): string {
    return LIST.format(services.map((s) => s.name));
}

// Streamings aprendidos pelo uso (US018). Lista vazia continua valendo como todos (RNG003).

/** Tira o serviço do sorteio. Nunca esvazia a lista: vazia voltaria a significar todos. */
export function withoutStreaming(
    streamings: readonly Streaming[],
    service: Streaming,
): Streaming[] {
    const current = streamings.length > 0 ? streamings : STREAMING_SERVICES.map((s) => s.id);
    const next = current.filter((s) => s !== service);
    return next.length > 0 ? next : [...current];
}

/**
 * O primeiro serviço do título sobre o qual perguntar: está no sorteio, não foi respondido e, se
 * for o único da lista, não há o que perguntar, porque "Não" não poderia tirá-lo.
 */
export function streamingToAsk(
    available: readonly StreamingService[],
    streamings: readonly Streaming[],
    answered: readonly Streaming[],
): StreamingService | null {
    if (streamings.length === 1) return null;
    return (
        available.find(
            (s) =>
                !answered.includes(s.id) && (streamings.length === 0 || streamings.includes(s.id)),
        ) ?? null
    );
}

/** O título ainda está em algum streaming da pessoa? */
export function isOnStreamings(
    available: readonly StreamingService[],
    streamings: readonly Streaming[],
): boolean {
    return available.some((s) => streamings.length === 0 || streamings.includes(s.id));
}

/** "Todos os streamings" com a lista vazia ou completa; senão, "Netflix, Max". */
export function streamingSummary(streamings: readonly Streaming[]): string | null {
    if (streamings.length === 0 || streamings.length === STREAMING_SERVICES.length) return null;
    return STREAMING_SERVICES.filter((s) => streamings.includes(s.id))
        .map((s) => s.name)
        .join(", ");
}
