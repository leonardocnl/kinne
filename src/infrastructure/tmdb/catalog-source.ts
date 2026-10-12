import type { CatalogSource, Credit, DetailsResult, Tag } from "@/application/sync-catalog";
import { pickTrailer, type TitleType } from "@/domain/catalog";
import { pickBackdrop, pickCertification } from "@/domain/catalog-sync";
import { TmdbHttpError, type TmdbClient } from "./client";
import {
    changesPageSchema,
    discoverPageSchema,
    movieDetailsSchema,
    seriesDetailsSchema,
} from "./schemas";

const tmdbPath = (type: TitleType) => (type === "movie" ? "movie" : "tv");
const toTag = (t: { id: number; name: string }): Tag => ({ tmdbId: t.id, name: t.name });

// O discover do TMDB para em 500 páginas (10.000 resultados).
const RESULT_CAP = 10_000;
const MIN_YEAR = 1870;
const MAX_CAST = 10; // C2
// Trailer em pt ou no idioma original (pickTrailer): pedimos os idiomas originais mais comuns
// numa chamada só. ponytail: idioma original fora da lista fica sem trailer; ampliar se faltar.
const VIDEO_LANGUAGES = "pt,en,es,fr,de,it,ja,ko,zh,cn,hi,ru,tr,sv,da,no,pl,nl,th,id,ar,he,null";

const day = (d: Date) => d.toISOString().slice(0, 10);

export class TmdbCatalogSource implements CatalogSource {
    constructor(private readonly client: TmdbClient) {}

    get requestCount() {
        return this.client.requestCount;
    }

    // Divide por faixa de anos até cada consulta ficar abaixo de 10.000 (B3). Um ano sozinho no
    // limite derruba a carga. ponytail: títulos sem data só entram enquanto não há divisão.
    async discover(type: TitleType, streamingTmdbId: number): Promise<number[]> {
        const ids = new Set<number>();
        const dateField = type === "movie" ? "primary_release_date" : "first_air_date";
        const query = (page: number, years: [number, number] | null) =>
            this.client
                .get(`/discover/${tmdbPath(type)}`, {
                    watch_region: "BR",
                    with_watch_monetization_types: "flatrate",
                    with_watch_providers: streamingTmdbId,
                    include_adult: "false",
                    // ordem estável enquanto paginamos
                    sort_by: type === "movie" ? "original_title.asc" : "original_name.asc",
                    page,
                    ...(years && {
                        [`${dateField}.gte`]: `${years[0]}-01-01`,
                        [`${dateField}.lte`]: `${years[1]}-12-31`,
                    }),
                })
                .then((r) => discoverPageSchema.parse(r));

        const visit = async (years: [number, number] | null): Promise<void> => {
            const first = await query(1, years);
            if (first.total_results >= RESULT_CAP) {
                const [from, to] = years ?? [MIN_YEAR, new Date().getUTCFullYear() + 5];
                if (from === to) {
                    console.warn(`Aviso: ${type} ${streamingTmdbId} ${from} no limite do TMDB`);
                    throw new Error(`Listagem ainda no limite de ${RESULT_CAP} após dividir`);
                }
                const mid = Math.floor((from + to) / 2);
                await visit([from, mid]);
                await visit([mid + 1, to]);
                return;
            }
            const rest = await Promise.all(
                Array.from({ length: first.total_pages - 1 }, (_, i) => query(i + 2, years)),
            );
            for (const p of [first, ...rest]) for (const r of p.results) ids.add(r.id);
        };
        await visit(null);
        return [...ids];
    }

    async changedIds(type: TitleType, from: Date, to: Date): Promise<Set<number>> {
        const query = (page: number) =>
            this.client
                .get(`/${tmdbPath(type)}/changes`, {
                    start_date: day(from),
                    end_date: day(to),
                    page,
                })
                .then((r) => changesPageSchema.parse(r));
        const first = await query(1);
        const rest = await Promise.all(
            Array.from({ length: first.total_pages - 1 }, (_, i) => query(i + 2)),
        );
        return new Set([first, ...rest].flatMap((p) => p.results.map((r) => r.id)));
    }

    async details(type: TitleType, tmdbId: number): Promise<DetailsResult> {
        let raw: unknown;
        try {
            raw = await this.client.get(`/${tmdbPath(type)}/${tmdbId}`, {
                language: "pt-BR",
                append_to_response:
                    type === "movie"
                        ? "credits,videos,images,keywords,release_dates"
                        : "credits,videos,images,keywords,content_ratings",
                include_video_language: VIDEO_LANGUAGES,
                include_image_language: "null,pt,en",
            });
        } catch (e) {
            if (e instanceof TmdbHttpError && e.status === 404) return { status: "gone" };
            throw e;
        }

        const common = (type === "movie" ? movieDetailsSchema : seriesDetailsSchema).safeParse(raw);
        if (!common.success) return { status: "rejected" };
        const d = common.data;

        const directors = new Map(
            d.credits.crew.filter((c) => c.job === "Director").map((c) => [c.id, c.name]),
        );
        const credits: Credit[] = [
            ...[...directors].map(([id, name], order) => ({
                tmdbPersonId: id,
                name,
                role: "director" as const,
                order,
            })),
            ...[...new Map(d.credits.cast.map((c) => [c.id, c])).values()]
                .sort((a, b) => a.order - b.order)
                .slice(0, MAX_CAST)
                .map((c, order) => ({
                    tmdbPersonId: c.id,
                    name: c.name,
                    role: "cast" as const,
                    order,
                })),
        ];
        const trailer = pickTrailer(
            d.videos.results.map((v) => ({
                site: v.site,
                type: v.type,
                key: v.key,
                languageCode: v.iso_639_1,
            })),
            d.original_language,
        );
        const base = {
            tmdbId: d.id,
            type,
            tagline: d.tagline,
            synopsis: d.overview,
            posterImagePath: d.poster_path ?? null,
            backdrop: pickBackdrop(
                d.images.backdrops.map((i) => ({
                    path: i.file_path,
                    width: i.width,
                    languageCode: i.iso_639_1,
                })),
            ),
            trailerYoutubeKey: trailer?.youtubeKey ?? null,
            trailerLanguageCode: trailer?.languageCode ?? null,
            rating: d.vote_average,
            voteCount: d.vote_count,
            genres: d.genres.map(toTag),
            credits,
        };

        if ("title" in d) {
            const countries = (c: string) =>
                d.release_dates.results
                    .filter((r) => r.iso_3166_1 === c)
                    .flatMap((r) => r.release_dates.map((x) => x.certification));
            const cert = pickCertification("movie", countries("BR"), countries("US"));
            return {
                status: "ok",
                title: {
                    ...base,
                    displayTitle: d.title,
                    originalTitle: d.original_title,
                    releaseYear: d.release_date,
                    runtimeMinutes: d.runtime || null,
                    certification: cert.certification,
                    certificationSource: cert.source,
                    keywords: d.keywords.keywords.map(toTag),
                },
            };
        }
        const countries = (c: string) =>
            d.content_ratings.results.filter((r) => r.iso_3166_1 === c).map((r) => r.rating);
        const cert = pickCertification("series", countries("BR"), countries("US"));
        return {
            status: "ok",
            title: {
                ...base,
                displayTitle: d.name,
                originalTitle: d.original_name,
                releaseYear: d.first_air_date,
                runtimeMinutes: d.episode_run_time[0] || null,
                certification: cert.certification,
                certificationSource: cert.source,
                keywords: d.keywords.results.map(toTag),
            },
        };
    }
}
