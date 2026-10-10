import type { CatalogRepository, CatalogTitle, Tag } from "@/application/sync-catalog";
import { and, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Db } from "./client";
import {
    catalogTitleGenres,
    catalogTitles,
    catalogTitleThemeKeywords,
    genres,
    streamingAvailability,
    streamingServices,
    themeKeywords,
} from "./schema";

const COUNTRY = "BR";
const CHUNK = 1000;

const chunks = <T>(items: T[], size = CHUNK) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size),
    );

const uniqueTags = (tags: Tag[]) => [...new Map(tags.map((t) => [t.tmdbId, t])).values()];

const excluded = (column: string): SQL => sql.raw(`excluded.${column}`);

export class DrizzleCatalogRepository implements CatalogRepository {
    constructor(private readonly db: Db) {}

    async existingSlugs() {
        const rows = await this.db
            .select({
                tmdbId: catalogTitles.tmdbId,
                type: catalogTitles.titleType,
                slug: catalogTitles.slug,
            })
            .from(catalogTitles);
        return new Map(rows.map((r) => [`${r.type}:${r.tmdbId}`, r.slug]));
    }

    async save(titles: CatalogTitle[], syncedAt: Date) {
        if (titles.length === 0) return;
        const db = this.db;

        // Gêneros que o seed não conhecia entram sem gênero do Kinne; palavras-chave são upsert.
        const genreIds = await this.upsertTags(
            genres,
            uniqueTags(titles.flatMap((t) => t.genres)),
            false,
        );
        const keywordIds = await this.upsertTags(
            themeKeywords,
            uniqueTags(titles.flatMap((t) => t.keywords)),
            true,
        );
        const services = await db.select().from(streamingServices);
        const serviceIds = new Map(services.map((s) => [s.tmdbId, s.id]));

        const titleIds = new Map<string, number>();
        for (const chunk of chunks(titles, 500)) {
            const rows = await db
                .insert(catalogTitles)
                .values(
                    chunk.map((t) => ({
                        tmdbId: t.tmdbId,
                        titleType: t.type,
                        slug: t.slug,
                        displayTitle: t.displayTitle,
                        originalTitle: t.originalTitle,
                        tagline: t.tagline,
                        synopsis: t.synopsis,
                        posterImagePath: t.posterImagePath,
                        backdropImagePath: t.backdropImagePath,
                        trailerYoutubeKey: t.trailerYoutubeKey,
                        trailerLanguageCode: t.trailerLanguageCode,
                        releaseYear: t.releaseYear,
                        runtimeMinutes: t.runtimeMinutes,
                        tmdbAverageRating: t.rating.toFixed(1),
                        tmdbVoteCount: t.voteCount,
                        lastSyncedAt: syncedAt,
                    })),
                )
                .onConflictDoUpdate({
                    target: [catalogTitles.tmdbId, catalogTitles.titleType],
                    set: Object.fromEntries(
                        [
                            ["slug", "slug"],
                            ["displayTitle", "display_title"],
                            ["originalTitle", "original_title"],
                            ["tagline", "tagline"],
                            ["synopsis", "synopsis"],
                            ["posterImagePath", "poster_image_path"],
                            ["backdropImagePath", "backdrop_image_path"],
                            ["trailerYoutubeKey", "trailer_youtube_key"],
                            ["trailerLanguageCode", "trailer_language_code"],
                            ["releaseYear", "release_year"],
                            ["runtimeMinutes", "runtime_minutes"],
                            ["tmdbAverageRating", "tmdb_average_rating"],
                            ["tmdbVoteCount", "tmdb_vote_count"],
                            ["lastSyncedAt", "last_synced_at"],
                        ].map(([prop, column]) => [prop, excluded(column)]),
                    ),
                })
                .returning({
                    id: catalogTitles.id,
                    tmdbId: catalogTitles.tmdbId,
                    type: catalogTitles.titleType,
                });
            for (const r of rows) titleIds.set(`${r.type}:${r.tmdbId}`, r.id);
        }
        const idOf = (t: CatalogTitle) => titleIds.get(`${t.type}:${t.tmdbId}`)!;
        const ids = [...titleIds.values()];

        const genreLinks = titles.flatMap((t) =>
            uniqueTags(t.genres).map((g) => ({
                catalogTitleId: idOf(t),
                genreId: genreIds.get(g.tmdbId)!,
            })),
        );
        const keywordLinks = titles.flatMap((t) =>
            uniqueTags(t.keywords).map((k) => ({
                catalogTitleId: idOf(t),
                themeKeywordId: keywordIds.get(k.tmdbId)!,
            })),
        );
        const availability = titles.flatMap((t) =>
            [...new Set(t.streamingTmdbIds)].map((s) => ({
                streamingServiceId: serviceIds.get(s)!,
                catalogTitleId: idOf(t),
                countryCode: COUNTRY,
            })),
        );

        // Substitui os vínculos dos títulos desta carga numa única transação (batch do neon-http).
        const statements: BatchItem<"pg">[] = [
            ...chunks(ids, 5000).flatMap((c) => [
                db.delete(catalogTitleGenres).where(inArray(catalogTitleGenres.catalogTitleId, c)),
                db
                    .delete(catalogTitleThemeKeywords)
                    .where(inArray(catalogTitleThemeKeywords.catalogTitleId, c)),
                db
                    .delete(streamingAvailability)
                    .where(
                        and(
                            inArray(streamingAvailability.catalogTitleId, c),
                            eq(streamingAvailability.countryCode, COUNTRY),
                        ),
                    ),
            ]),
            ...chunks(genreLinks, 5000).map((c) => db.insert(catalogTitleGenres).values(c)),
            ...chunks(keywordLinks, 5000).map((c) =>
                db.insert(catalogTitleThemeKeywords).values(c),
            ),
            ...chunks(availability, 5000).map((c) => db.insert(streamingAvailability).values(c)),
        ];
        await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    }

    async countNotSyncedSince(syncedAt: Date) {
        return this.db.$count(catalogTitles, lt(catalogTitles.lastSyncedAt, syncedAt));
    }

    private async upsertTags(
        table: typeof genres | typeof themeKeywords,
        tags: Tag[],
        updateName: boolean,
    ) {
        const ids = new Map<number, number>();
        for (const chunk of chunks(tags)) {
            const insert = this.db
                .insert(table)
                .values(chunk.map((t) => ({ tmdbId: t.tmdbId, name: t.name })));
            await (updateName
                ? insert.onConflictDoUpdate({
                      target: table.tmdbId,
                      set: { name: excluded("name") },
                  })
                : insert.onConflictDoNothing());
        }
        const rows = await this.db
            .select({ id: table.id, tmdbId: table.tmdbId })
            .from(table)
            .where(
                inArray(
                    table.tmdbId,
                    tags.map((t) => t.tmdbId),
                ),
            );
        for (const r of rows) ids.set(r.tmdbId, r.id);
        return ids;
    }
}
