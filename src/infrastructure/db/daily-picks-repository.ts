import "server-only";
import type { DailyPickTitle, DailyPicksRepository } from "@/application/daily-picks";
import type { TitleType } from "@/domain/catalog";
import { ADULT_CERTIFICATION } from "@/domain/catalog-sync";
import type { DailyPick } from "@/domain/daily-picks";
import type { Day } from "@/domain/day";
import type { KinneGenre } from "@/domain/genre";
import { and, eq, gte, isNotNull, ne, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
    catalogTitleGenres,
    catalogTitles,
    dailyPicks,
    genres,
    streamingAvailability,
    streamingServices,
} from "./schema";

const COUNTRY = "BR";

export class DrizzleDailyPicksRepository implements DailyPicksRepository {
    constructor(private readonly db: Db) {}

    async picksOf(day: Day): Promise<DailyPickTitle[]> {
        const rows = await this.db
            .select({
                genre: dailyPicks.kinneGenre,
                slug: catalogTitles.slug,
                type: catalogTitles.titleType,
                title: catalogTitles.displayTitle,
                tagline: catalogTitles.tagline,
                synopsis: catalogTitles.synopsis,
                releaseYear: catalogTitles.releaseYear,
                runtimeMinutes: catalogTitles.runtimeMinutes,
                backdropImagePath: catalogTitles.backdropImagePath,
                backdropWidth: catalogTitles.backdropWidth,
                posterImagePath: catalogTitles.posterImagePath,
                streamingTmdbIds: sql<number[]>`coalesce(array_agg(${streamingServices.tmdbId})
                    filter (where ${streamingServices.tmdbId} is not null), '{}')`,
            })
            .from(dailyPicks)
            .innerJoin(catalogTitles, eq(catalogTitles.id, dailyPicks.catalogTitleId))
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
            .where(and(eq(dailyPicks.pickDate, day), eq(catalogTitles.isBlocked, false)))
            .groupBy(dailyPicks.kinneGenre, catalogTitles.id);
        return rows.map((r) => ({
            ...r,
            genre: r.genre as KinneGenre,
            type: r.type as TitleType,
        }));
    }

    async candidates() {
        const rows = await this.db
            .select({
                id: catalogTitles.id,
                type: catalogTitles.titleType,
                rating: catalogTitles.tmdbAverageRating,
                votes: catalogTitles.tmdbVoteCount,
                genres: sql<string[]>`array_agg(distinct ${genres.kinneGenre})`,
                onStreaming: sql<boolean>`exists (select 1 from ${streamingAvailability}
                    where ${streamingAvailability.catalogTitleId} = ${catalogTitles.id}
                    and ${streamingAvailability.countryCode} = ${COUNTRY})`,
            })
            .from(catalogTitles)
            .innerJoin(catalogTitleGenres, eq(catalogTitleGenres.catalogTitleId, catalogTitles.id))
            .innerJoin(genres, eq(genres.id, catalogTitleGenres.genreId))
            .where(and(isNotNull(genres.kinneGenre), dailyPickTitle))
            .groupBy(catalogTitles.id);
        return rows.map((r) => ({
            ...r,
            type: r.type as TitleType,
            rating: Number(r.rating),
            genres: r.genres as KinneGenre[],
        }));
    }

    async history(from: Day) {
        const rows = await this.db
            .select({ day: dailyPicks.pickDate, titleId: dailyPicks.catalogTitleId })
            .from(dailyPicks)
            .where(gte(dailyPicks.pickDate, from));
        return rows.map((r) => ({ ...r, day: r.day as Day }));
    }

    async saveDay(day: Day, picks: DailyPick[]) {
        // Uma instrução só: as cinco entram juntas ou nenhuma, e o dia que já existe fica.
        await this.db
            .insert(dailyPicks)
            .values(
                picks.map((p) => ({
                    pickDate: day,
                    kinneGenre: p.genre,
                    catalogTitleId: p.titleId,
                })),
            )
            .onConflictDoNothing();
    }
}

/**
 * Quem pode ser indicação do dia: recomendável (C7), não bloqueado e nunca 18 (A7,
 * recommendation-rounds A2), seja qual for o chip 18+ de quem visita.
 */
export const dailyPickTitle = and(
    eq(catalogTitles.isRecommendable, true),
    eq(catalogTitles.isBlocked, false),
    ne(catalogTitles.certificationBr, ADULT_CERTIFICATION),
);
