import type { CatalogSource, Tag, TitleDetails } from "@/application/sync-catalog";
import { MIN_RATING, MIN_VOTES, type TitleType } from "@/domain/catalog";
import type { TmdbClient } from "./client";

type DiscoverPage = { page: number; total_pages: number; results: { id: number }[] };

type RawDetails = {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    original_language: string;
    tagline: string | null;
    overview: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    runtime?: number | null;
    episode_run_time?: number[];
    vote_average: number;
    vote_count: number;
    genres: { id: number; name: string }[];
    keywords: {
        keywords?: { id: number; name: string }[];
        results?: { id: number; name: string }[];
    };
    videos: {
        results: { site: string; type: string; key: string; iso_639_1: string | null }[];
    };
};

const tmdbPath = (type: TitleType) => (type === "movie" ? "movie" : "tv");
const orNull = (s: string | null | undefined) => s?.trim() || null;
const toTag = (t: { id: number; name: string }): Tag => ({ tmdbId: t.id, name: t.name });

export class TmdbCatalogSource implements CatalogSource {
    constructor(private readonly client: TmdbClient) {}

    get requestCount() {
        return this.client.requestCount;
    }

    async discover(type: TitleType, streamingTmdbId: number): Promise<number[]> {
        const page = (n: number) =>
            this.client.get<DiscoverPage>(`/discover/${tmdbPath(type)}`, {
                watch_region: "BR",
                with_watch_monetization_types: "flatrate",
                with_watch_providers: streamingTmdbId,
                "vote_average.gte": MIN_RATING,
                "vote_count.gte": MIN_VOTES,
                include_adult: "false",
                language: "pt-BR",
                sort_by: "vote_count.desc",
                page: n,
            });
        const first = await page(1);
        const rest = await Promise.all(
            Array.from({ length: Math.min(first.total_pages, 500) - 1 }, (_, i) => page(i + 2)),
        );
        // A ordem pode mudar entre páginas enquanto paginamos; o Set tira repetidos.
        return [...new Set([first, ...rest].flatMap((p) => p.results.map((r) => r.id)))];
    }

    async details(type: TitleType, tmdbId: number): Promise<TitleDetails> {
        const d = await this.client.get<RawDetails>(`/${tmdbPath(type)}/${tmdbId}`, {
            language: "pt-BR",
            append_to_response: "videos,keywords",
            include_video_language: "pt,en,null",
        });
        const date = type === "movie" ? d.release_date : d.first_air_date;
        return {
            tmdbId: d.id,
            type,
            displayTitle: (type === "movie" ? d.title : d.name) ?? "",
            originalTitle: (type === "movie" ? d.original_title : d.original_name) ?? "",
            originalLanguage: d.original_language,
            tagline: orNull(d.tagline),
            synopsis: orNull(d.overview),
            posterImagePath: d.poster_path,
            backdropImagePath: d.backdrop_path,
            releaseYear: date ? Number(date.slice(0, 4)) : null,
            runtimeMinutes: (type === "movie" ? d.runtime : d.episode_run_time?.[0]) || null,
            rating: d.vote_average,
            voteCount: d.vote_count,
            genres: d.genres.map(toTag),
            keywords: (d.keywords.keywords ?? d.keywords.results ?? []).map(toTag),
            videos: d.videos.results.map((v) => ({
                site: v.site,
                type: v.type,
                key: v.key,
                languageCode: v.iso_639_1,
            })),
        };
    }
}
