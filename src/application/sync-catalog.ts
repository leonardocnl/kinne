import {
    baseSlug,
    meetsQualityFloor,
    pickTrailer,
    uniqueSlug,
    type TitleType,
    type Video,
} from "@/domain/catalog";
import { KINNE_GENRES, kinneGenreFor, type KinneGenre } from "@/domain/genre";
import { STREAMING_SERVICES } from "@/domain/streaming";

export type Tag = { tmdbId: number; name: string };

export type TitleDetails = {
    tmdbId: number;
    type: TitleType;
    displayTitle: string;
    originalTitle: string;
    originalLanguage: string;
    tagline: string | null;
    synopsis: string | null;
    posterImagePath: string | null;
    backdropImagePath: string | null;
    releaseYear: number | null;
    runtimeMinutes: number | null;
    rating: number;
    voteCount: number;
    genres: Tag[];
    keywords: Tag[];
    videos: Video[];
};

export type CatalogTitle = Omit<TitleDetails, "videos" | "originalLanguage"> & {
    slug: string;
    trailerYoutubeKey: string | null;
    trailerLanguageCode: string | null;
    streamingTmdbIds: number[];
};

export interface CatalogSource {
    readonly requestCount: number;
    // tmdb_ids dos títulos de um tipo disponíveis por assinatura num streaming (BR, já com o piso).
    discover(type: TitleType, streamingTmdbId: number): Promise<number[]>;
    details(type: TitleType, tmdbId: number): Promise<TitleDetails>;
}

export interface CatalogRepository {
    // slug atual de cada título já gravado, por chave `${type}:${tmdbId}`.
    existingSlugs(): Promise<Map<string, string>>;
    // Upsert dos títulos; gêneros, palavras-chave e disponibilidade de cada um são substituídos.
    save(titles: CatalogTitle[], syncedAt: Date): Promise<void>;
    countNotSyncedSince(syncedAt: Date): Promise<number>;
}

export type SyncSummary = {
    byType: Record<TitleType, number>;
    byStreaming: Record<string, number>;
    byKinneGenre: Record<KinneGenre, number>;
    belowFloor: number;
    withoutTagline: number;
    withoutTrailer: number;
    withoutBackdrop: number;
    notInThisSync: number;
    requests: number;
    elapsedMs: number;
};

const key = (type: TitleType, tmdbId: number) => `${type}:${tmdbId}`;

export async function syncCatalog(
    source: CatalogSource,
    repository: CatalogRepository,
): Promise<SyncSummary> {
    const startedAt = new Date();

    // 1. Disponibilidade título × streaming.
    const availability = new Map<string, { type: TitleType; tmdbId: number; streams: number[] }>();
    const discovered = await Promise.all(
        (["movie", "series"] as const).flatMap((type) =>
            STREAMING_SERVICES.map(async (s) => ({
                type,
                streamingTmdbId: s.tmdbId,
                ids: await source.discover(type, s.tmdbId),
            })),
        ),
    );
    for (const { type, streamingTmdbId, ids } of discovered) {
        for (const tmdbId of ids) {
            const entry = availability.get(key(type, tmdbId)) ?? { type, tmdbId, streams: [] };
            entry.streams.push(streamingTmdbId);
            availability.set(key(type, tmdbId), entry);
        }
    }

    // 2. Detalhes de cada título único. Filmes antes de séries, para a série levar o "-serie".
    const entries = [...availability.values()].sort((a, b) =>
        a.type === b.type ? a.tmdbId - b.tmdbId : a.type === "movie" ? -1 : 1,
    );
    const details = await Promise.all(entries.map((e) => source.details(e.type, e.tmdbId)));

    const existing = await repository.existingSlugs();
    const taken = new Set(existing.values());
    const titles: CatalogTitle[] = [];
    let belowFloor = 0;
    details.forEach((d, i) => {
        if (!meetsQualityFloor(d.rating, d.voteCount)) {
            belowFloor++;
            return;
        }
        const { videos, originalLanguage, ...rest } = d;
        // Quem já está no banco mantém o slug (URL estável).
        const slug =
            existing.get(key(d.type, d.tmdbId)) ??
            uniqueSlug(baseSlug(d.displayTitle, d.releaseYear), d.type, d.tmdbId, taken);
        taken.add(slug);
        const trailer = pickTrailer(videos, originalLanguage);
        titles.push({
            ...rest,
            slug,
            trailerYoutubeKey: trailer?.youtubeKey ?? null,
            trailerLanguageCode: trailer?.languageCode ?? null,
            streamingTmdbIds: entries[i].streams,
        });
    });

    // 3. Gravação.
    await repository.save(titles, startedAt);

    // 4. Títulos que ficaram de fora desta carga não são apagados (US007 RNE003); só contados.
    const notInThisSync = await repository.countNotSyncedSince(startedAt);

    // 5. Resumo.
    const count = <K extends string>(keys: K[], pick: (t: CatalogTitle) => K[]) => {
        const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
        for (const t of titles) for (const k of new Set(pick(t))) out[k]++;
        return out;
    };
    const streamingName = new Map<number, string>(
        STREAMING_SERVICES.map((s) => [s.tmdbId, s.name]),
    );
    return {
        byType: count(["movie", "series"], (t) => [t.type]),
        byStreaming: count(
            STREAMING_SERVICES.map((s) => s.name),
            (t) => t.streamingTmdbIds.map((id) => streamingName.get(id)!),
        ),
        byKinneGenre: count([...KINNE_GENRES], (t) =>
            t.genres.map((g) => kinneGenreFor(g.tmdbId)).filter((g) => g !== null),
        ),
        belowFloor,
        withoutTagline: titles.filter((t) => !t.tagline).length,
        withoutTrailer: titles.filter((t) => !t.trailerYoutubeKey).length,
        withoutBackdrop: titles.filter((t) => !t.backdropImagePath).length,
        notInThisSync,
        requests: source.requestCount,
        elapsedMs: Date.now() - startedAt.getTime(),
    };
}
