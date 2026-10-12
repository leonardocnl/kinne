import "server-only";
import type { CatalogEntry, TitlesRepository } from "@/application/titles";
import type { TitleType } from "@/domain/catalog";
import { ADULT_CERTIFICATION } from "@/domain/catalog-sync";
import { CAST_SHOWN, MAX_DIRECTORS } from "@/domain/credits";
import { isKinneGenre } from "@/domain/genre";
import { and, asc, eq, lt, ne, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
    catalogTitleGenres,
    catalogTitles,
    genres,
    people,
    streamingAvailability,
    streamingServices,
    titleCredits,
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
                backdropWidth: catalogTitles.backdropWidth,
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
        const credits = await this.credits(row.id);
        return {
            ...row,
            ...credits,
            type: row.type as TitleType,
            rating: Number(row.rating),
            kinneGenres: row.kinneGenres.filter((g) => g !== null && isKinneGenre(g)),
            genreNames: row.genreNames.filter((n) => n !== null),
        };
    }

    /** Diretores (até MAX_DIRECTORS) e o começo do elenco, na ordem dos créditos (fase 2). */
    private async credits(titleId: number): Promise<{ directors: string[]; cast: string[] }> {
        const rows = await creditsQuery(this.db, titleId);
        return {
            directors: rows.filter((r) => r.role === "director").map((r) => r.name),
            cast: rows.filter((r) => r.role === "cast").map((r) => r.name),
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
                    // bloqueado à mão sai mesmo antes de a carga recalcular is_recommendable
                    eq(catalogTitles.isBlocked, false),
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

/**
 * Créditos de um título para a tela do título: todos os diretores (até MAX_DIRECTORS) e os
 * CAST_SHOWN primeiros do elenco. Elenco ("cast") antes de direção ("director"), cada um na
 * ordem; o teto limita a leitura mesmo com dados inesperados (title-credits D1).
 */
export function creditsQuery(db: Db, titleId: number) {
    return db
        .select({ role: titleCredits.role, name: people.name })
        .from(titleCredits)
        .innerJoin(people, eq(people.id, titleCredits.personId))
        .where(
            and(
                eq(titleCredits.catalogTitleId, titleId),
                or(eq(titleCredits.role, "director"), lt(titleCredits.creditOrder, CAST_SHOWN)),
            ),
        )
        .orderBy(asc(titleCredits.role), asc(titleCredits.creditOrder))
        .limit(CAST_SHOWN + MAX_DIRECTORS);
}
