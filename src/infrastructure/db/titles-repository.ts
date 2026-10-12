import type { CatalogEntry, TitlesRepository } from "@/application/titles";
import type { TitleType } from "@/domain/catalog";
import { ADULT_CERTIFICATION } from "@/domain/catalog-sync";
import { isKinneGenre } from "@/domain/genre";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
    catalogTitleGenres,
    catalogTitles,
    genres,
    streamingAvailability,
    streamingServices,
} from "./schema";

const COUNTRY = "BR";

const streamingTmdbIds = sql<number[]>`coalesce(array_agg(distinct ${streamingServices.tmdbId})
    filter (where ${streamingServices.tmdbId} is not null), '{}')`;

export class DrizzleTitlesRepository implements TitlesRepository {
    constructor(private readonly db: Db) {}

    async bySlug(slug: string): Promise<CatalogEntry | null> {
        const [row] = await this.db
            .select({
                id: catalogTitles.id,
                slug: catalogTitles.slug,
                type: catalogTitles.titleType,
                title: catalogTitles.displayTitle,
                tagline: catalogTitles.tagline,
                synopsis: catalogTitles.synopsis,
                backdropImagePath: catalogTitles.backdropImagePath,
                trailerYoutubeKey: catalogTitles.trailerYoutubeKey,
                releaseYear: catalogTitles.releaseYear,
                runtimeMinutes: catalogTitles.runtimeMinutes,
                rating: catalogTitles.tmdbAverageRating,
                kinneGenres: sql<(string | null)[]>`array_agg(distinct ${genres.kinneGenre})`,
                genreNames: sql<(string | null)[]>`array_agg(distinct ${genres.name})`,
                streamingTmdbIds,
                recommendable: catalogTitles.isRecommendable,
            })
            .from(catalogTitles)
            .leftJoin(catalogTitleGenres, eq(catalogTitleGenres.catalogTitleId, catalogTitles.id))
            .leftJoin(genres, eq(genres.id, catalogTitleGenres.genreId))
            .leftJoin(
                streamingAvailability,
                and(
                    eq(streamingAvailability.catalogTitleId, catalogTitles.id),
                    eq(streamingAvailability.countryCode, COUNTRY),
                ),
            )
            .leftJoin(
                streamingServices,
                eq(streamingServices.id, streamingAvailability.streamingServiceId),
            )
            .where(and(eq(catalogTitles.slug, slug), eq(catalogTitles.isBlocked, false)))
            .groupBy(catalogTitles.id);
        if (!row) return null;
        return {
            ...row,
            type: row.type as TitleType,
            rating: Number(row.rating),
            kinneGenres: row.kinneGenres.filter((g) => g !== null && isKinneGenre(g)),
            genreNames: row.genreNames.filter((n) => n !== null),
        };
    }

    async candidates() {
        const rows = await this.db
            .select({
                id: catalogTitles.id,
                slug: catalogTitles.slug,
                type: catalogTitles.titleType,
                rating: catalogTitles.tmdbAverageRating,
                votes: catalogTitles.tmdbVoteCount,
                runtimeMinutes: catalogTitles.runtimeMinutes,
                kinneGenres: sql<(string | null)[]>`array_agg(distinct ${genres.kinneGenre})`,
                streamingTmdbIds,
            })
            .from(catalogTitles)
            .leftJoin(catalogTitleGenres, eq(catalogTitleGenres.catalogTitleId, catalogTitles.id))
            .leftJoin(genres, eq(genres.id, catalogTitleGenres.genreId))
            .innerJoin(
                streamingAvailability,
                and(
                    eq(streamingAvailability.catalogTitleId, catalogTitles.id),
                    eq(streamingAvailability.countryCode, COUNTRY),
                ),
            )
            .innerJoin(
                streamingServices,
                eq(streamingServices.id, streamingAvailability.streamingServiceId),
            )
            // Recomendável (C7); 18 só pelo chip 18+, que ainda não existe (A7).
            .where(
                and(
                    eq(catalogTitles.isRecommendable, true),
                    ne(catalogTitles.certificationBr, ADULT_CERTIFICATION),
                ),
            )
            .groupBy(catalogTitles.id);
        return rows.map((r) => ({
            ...r,
            type: r.type as TitleType,
            rating: Number(r.rating),
            kinneGenres: r.kinneGenres.filter((g) => g !== null && isKinneGenre(g)),
        }));
    }
}
