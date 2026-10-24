import "server-only";
import type {
    CatalogRepository,
    CatalogTitle,
    ExistingTitle,
    FinalizePlan,
    SyncCounts,
    Tag,
} from "@/application/sync-catalog";
import type { TitleType } from "@/domain/catalog";
import type { BrCertification } from "@/domain/catalog-sync";
import { Client } from "@neondatabase/serverless";
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
    anonymousUsageEvents,
    catalogTitleGenres,
    catalogTitleProductionCompanies,
    catalogTitles,
    catalogTitleThemeKeywords,
    dailyPicks,
    genres,
    meta,
    people,
    productionCompanies,
    streamingAvailability,
    streamingServices,
    syncRuns,
    themeKeywords,
    titleCredits,
    titleNeighbors,
    tmdbRecommendations,
} from "./schema";

// O drizzle não qualifica ${t.id} numa select de uma tabela só, e dentro do exists "id" viraria
// o da tabela de eventos: o id do título vai escrito à mão.
export const titleReferenced = sql<boolean>`exists (select 1 from ${anonymousUsageEvents}
    where ${anonymousUsageEvents.catalogTitleId} = "catalog_titles"."id")
    or exists (select 1 from ${dailyPicks}
    where ${dailyPicks.catalogTitleId} = "catalog_titles"."id")`;

const COUNTRY = "BR";
const CHUNK = 2000;
// Qualquer número fixo serve; só a carga usa este lock.
const LOCK_KEY = 7_311_001;
// title-search B5: o orçamento diário do TMDB já limita as linhas novas; o teto cobre o resto
const MAX_SEARCH_CACHE_ROWS = 10_000;

export type SearchState = {
    cacheRows: number;
    counters: { day: string; name: string; count: number }[];
};

const chunks = <T>(items: readonly T[], size = CHUNK) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size),
    );

const uniqueBy = <T, K>(items: T[], by: (t: T) => K) => [
    ...new Map(items.map((i) => [by(i), i])).values(),
];

// Nomes de coluna fixos deste arquivo, nunca dado de fora (C6).
const excluded = (column: string): SQL => sql.raw(`excluded.${column}`);

// O que a carga reescreve num título. slug, is_blocked, is_active e is_recommendable ficam de fora.
const CONTENT_COLUMNS = {
    displayTitle: "display_title",
    originalTitle: "original_title",
    tagline: "tagline",
    synopsis: "synopsis",
    posterImagePath: "poster_image_path",
    backdropImagePath: "backdrop_image_path",
    backdropWidth: "backdrop_width",
    trailerYoutubeKey: "trailer_youtube_key",
    trailerLanguageCode: "trailer_language_code",
    releaseYear: "release_year",
    runtimeMinutes: "runtime_minutes",
    tmdbAverageRating: "tmdb_average_rating",
    tmdbVoteCount: "tmdb_vote_count",
    certificationBr: "certification_br",
    certificationSource: "certification_source",
    seriesType: "series_type",
    collectionTmdbId: "collection_tmdb_id",
} as const;
const columns = Object.values(CONTENT_COLUMNS);
// Só regrava (e só conta como atualizado) o que mudou de fato: a segunda carga não muda nada.
const contentChanged = sql.raw(
    `(${columns.map((c) => `catalog_titles.${c}`).join(", ")}) is distinct from ` +
        `(${columns.map((c) => `excluded.${c}`).join(", ")})`,
);

// Uma sessão só (WebSocket, conexão direta): o advisory lock é por sessão (B8) e cada lote é
// uma transação de verdade (B4).
export async function connectSyncDb(url: string) {
    const client = new Client(url);
    // D1: erro assíncrono da conexão sem handler imprimiria o erro do driver (host, usuário).
    client.on("error", () => console.error("Conexão com o banco falhou (detalhe omitido)"));
    await client.connect();
    return { db: drizzle({ client }), close: () => client.end() };
}

type SyncDb = Awaited<ReturnType<typeof connectSyncDb>>["db"];
type Tx = Parameters<Parameters<SyncDb["transaction"]>[0]>[0];

export class DrizzleCatalogRepository implements CatalogRepository {
    constructor(private readonly db: SyncDb) {}

    async tryLock(): Promise<boolean> {
        const r = await this.db.execute<{ locked: boolean }>(
            sql`select pg_try_advisory_lock(${LOCK_KEY}) as locked`,
        );
        return r.rows[0].locked;
    }

    async environment(): Promise<string | null> {
        const [row] = await this.db.select().from(meta).where(eq(meta.key, "environment"));
        return row?.value ?? null;
    }

    async lastOkWindowEnd(): Promise<Date | null> {
        const [row] = await this.db
            .select({ end: syncRuns.changesWindowEndAt })
            .from(syncRuns)
            .where(eq(syncRuns.status, "ok"))
            .orderBy(desc(syncRuns.startedAt))
            .limit(1);
        return row?.end ?? null;
    }

    async startRun(target: string, startedAt: Date): Promise<number> {
        const [row] = await this.db
            .insert(syncRuns)
            .values({ target, startedAt })
            .returning({ id: syncRuns.id });
        return row.id;
    }

    async finishRun(
        id: number,
        run: {
            status: "ok" | "aborted" | "failed" | "skipped";
            abortReason?: string | null;
            window?: { start: Date | null; end: Date };
            counts?: Partial<SyncCounts>;
        },
    ): Promise<number> {
        const size = await this.databaseSizeBytes();
        const c = run.counts ?? {};
        await this.db
            .update(syncRuns)
            .set({
                status: run.status,
                finishedAt: new Date(),
                abortReason: run.abortReason ?? null,
                changesWindowStartAt: run.window?.start ?? null,
                changesWindowEndAt: run.window?.end ?? null,
                fetchedCount: c.fetched ?? 0,
                insertedCount: c.inserted ?? 0,
                updatedCount: c.updated ?? 0,
                inactivatedCount: c.inactivated ?? 0,
                deletedCount: c.deleted ?? 0,
                rejectedCount: c.rejected ?? 0,
                recommendableCount: c.recommendable ?? 0,
                totalCount: c.total ?? 0,
                activeCount: c.active ?? 0,
                databaseSizeBytes: size,
            })
            .where(eq(syncRuns.id, id));
        return size;
    }

    /**
     * Limpeza diária da busca (title-search B5, G15) e os contadores para o resumo (F1). Um balde
     * parado há mais de um dia já está cheio de novo: apagar é o mesmo que deixá-lo.
     */
    async cleanSearchState(runId: number): Promise<SearchState> {
        await this.db.execute(sql`delete from search_cache where expires_at <= now()`);
        await this.db.execute(sql`delete from search_cache where term_hash in (
            select term_hash from search_cache order by created_at desc offset ${MAX_SEARCH_CACHE_ROWS})`);
        await this.db.execute(
            sql`delete from rate_limit_buckets where updated_at < now() - interval '1 day'`,
        );
        await this.db.execute(sql`delete from search_counters where day < current_date - 35`);
        const rows = await this.db.execute<{ n: string }>(
            sql`select count(*) as n from search_cache`,
        );
        const cacheRows = Number(rows.rows[0].n);
        await this.db
            .update(syncRuns)
            .set({ searchCacheRows: cacheRows })
            .where(eq(syncRuns.id, runId));
        const counters = await this.db.execute<{ day: string; name: string; count: number }>(
            sql`select day::text, name, count from search_counters
                where day >= current_date - 1 order by day, name`,
        );
        return { cacheRows, counters: counters.rows };
    }

    /**
     * Limpeza diária das salas de grupo vencidas (group-room C2): o site também apaga as que
     * encontra, mas uma sala que ninguém abre mais só sai por aqui. As filhas saem pelo cascade.
     */
    async cleanGroupRooms(): Promise<number> {
        const r = await this.db.execute<{ n: string }>(
            sql`with gone as (delete from group_rooms where expires_at <= now() returning 1)
                select count(*) as n from gone`,
        );
        return Number(r.rows[0].n);
    }

    async databaseSizeBytes(): Promise<number> {
        const r = await this.db.execute<{ size: string }>(
            sql`select pg_database_size(current_database()) as size`,
        );
        return Number(r.rows[0].size);
    }

    async existingTitles(): Promise<ExistingTitle[]> {
        const t = catalogTitles;
        const rows = await this.db
            .select({
                id: t.id,
                tmdbId: t.tmdbId,
                type: t.titleType,
                slug: t.slug,
                isActive: t.isActive,
                isBlocked: t.isBlocked,
                isRecommendable: t.isRecommendable,
                referenced: titleReferenced,
                hasSynopsis: sql<boolean>`${t.synopsis} is not null`,
                hasBackdrop: sql<boolean>`${t.backdropImagePath} is not null`,
                voteCount: t.tmdbVoteCount,
                certification: t.certificationBr,
            })
            .from(t);
        return rows.map((r) => ({
            ...r,
            type: r.type as TitleType,
            certification: r.certification as BrCertification | null,
        }));
    }

    async availability() {
        return this.db
            .select({
                titleId: streamingAvailability.catalogTitleId,
                streamingTmdbId: streamingServices.tmdbId,
            })
            .from(streamingAvailability)
            .innerJoin(
                streamingServices,
                eq(streamingServices.id, streamingAvailability.streamingServiceId),
            )
            .where(eq(streamingAvailability.countryCode, COUNTRY));
    }

    async saveBatch(titles: CatalogTitle[], syncedAt: Date) {
        if (titles.length === 0) return { inserted: [], updated: [] };
        return this.db.transaction(async (tx) => {
            const genreIds = await upsertTags(
                tx,
                genres,
                uniqueBy(
                    titles.flatMap((t) => t.genres),
                    (g) => g.tmdbId,
                ),
                false,
            );
            const keywordIds = await upsertTags(
                tx,
                themeKeywords,
                uniqueBy(
                    titles.flatMap((t) => t.keywords),
                    (k) => k.tmdbId,
                ),
                true,
            );
            const companyIds = await upsertTags(
                tx,
                productionCompanies,
                uniqueBy(
                    titles.flatMap((t) => t.companies),
                    (c) => c.tmdbId,
                ),
                true,
            );
            const personIds = await upsertPeople(
                tx,
                uniqueBy(
                    titles.flatMap((t) => t.credits),
                    (c) => c.tmdbPersonId,
                ),
            );

            const written = await tx
                .insert(catalogTitles)
                .values(
                    titles.map((t) => ({
                        tmdbId: t.tmdbId,
                        titleType: t.type,
                        slug: t.slug,
                        displayTitle: t.displayTitle,
                        originalTitle: t.originalTitle,
                        tagline: t.tagline,
                        synopsis: t.synopsis,
                        posterImagePath: t.posterImagePath,
                        backdropImagePath: t.backdrop?.path ?? null,
                        backdropWidth: t.backdrop?.width ?? null,
                        trailerYoutubeKey: t.trailerYoutubeKey,
                        trailerLanguageCode: t.trailerLanguageCode,
                        releaseYear: t.releaseYear,
                        runtimeMinutes: t.runtimeMinutes,
                        tmdbAverageRating: t.rating.toFixed(1),
                        tmdbVoteCount: t.voteCount,
                        certificationBr: t.certification,
                        certificationSource: t.certificationSource,
                        seriesType: t.seriesType,
                        collectionTmdbId: t.collectionTmdbId,
                        lastSyncedAt: syncedAt,
                    })),
                )
                .onConflictDoUpdate({
                    target: [catalogTitles.tmdbId, catalogTitles.titleType],
                    set: {
                        ...Object.fromEntries(
                            Object.entries(CONTENT_COLUMNS).map(([prop, col]) => [
                                prop,
                                excluded(col),
                            ]),
                        ),
                        lastSyncedAt: excluded("last_synced_at"),
                    },
                    setWhere: contentChanged,
                })
                .returning({
                    slug: catalogTitles.slug,
                    inserted: sql<boolean>`(xmax = 0)`,
                });

            const keys = sql.join(
                titles.map((t) => sql`(${t.tmdbId}, ${t.type})`),
                sql`, `,
            );
            const idRows = await tx
                .select({
                    id: catalogTitles.id,
                    tmdbId: catalogTitles.tmdbId,
                    type: catalogTitles.titleType,
                })
                .from(catalogTitles)
                .where(sql`(${catalogTitles.tmdbId}, ${catalogTitles.titleType}) in (${keys})`);
            const idOf = new Map(idRows.map((r) => [`${r.type}:${r.tmdbId}`, r.id]));
            const ids = idRows.map((r) => r.id);
            const titleId = (t: CatalogTitle) => idOf.get(`${t.type}:${t.tmdbId}`)!;

            // Vínculos dos títulos do lote: substituídos dentro da mesma transação.
            await tx
                .delete(catalogTitleGenres)
                .where(inArray(catalogTitleGenres.catalogTitleId, ids));
            await tx
                .delete(catalogTitleThemeKeywords)
                .where(inArray(catalogTitleThemeKeywords.catalogTitleId, ids));
            await tx.delete(titleCredits).where(inArray(titleCredits.catalogTitleId, ids));
            await tx
                .delete(catalogTitleProductionCompanies)
                .where(inArray(catalogTitleProductionCompanies.catalogTitleId, ids));
            await tx
                .delete(tmdbRecommendations)
                .where(inArray(tmdbRecommendations.catalogTitleId, ids));
            const insertAll = async <T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) => {
                for (const c of chunks(rows)) await insert(c);
            };
            await insertAll(
                titles.flatMap((t) =>
                    uniqueBy(t.genres, (g) => g.tmdbId).map((g) => ({
                        catalogTitleId: titleId(t),
                        genreId: genreIds.get(g.tmdbId)!,
                    })),
                ),
                (c) => tx.insert(catalogTitleGenres).values(c),
            );
            await insertAll(
                titles.flatMap((t) =>
                    uniqueBy(t.keywords, (k) => k.tmdbId).map((k) => ({
                        catalogTitleId: titleId(t),
                        themeKeywordId: keywordIds.get(k.tmdbId)!,
                    })),
                ),
                (c) => tx.insert(catalogTitleThemeKeywords).values(c),
            );
            await insertAll(
                titles.flatMap((t) =>
                    uniqueBy(t.credits, (c) => `${c.tmdbPersonId}:${c.role}`).map((c) => ({
                        catalogTitleId: titleId(t),
                        personId: personIds.get(c.tmdbPersonId)!,
                        role: c.role,
                        creditOrder: c.order,
                    })),
                ),
                (c) => tx.insert(titleCredits).values(c),
            );
            await insertAll(
                titles.flatMap((t) =>
                    uniqueBy(t.companies, (c) => c.tmdbId).map((c) => ({
                        catalogTitleId: titleId(t),
                        productionCompanyId: companyIds.get(c.tmdbId)!,
                    })),
                ),
                (c) => tx.insert(catalogTitleProductionCompanies).values(c),
            );
            await insertAll(
                titles.flatMap((t) =>
                    t.recommendations.map((r, i) => ({
                        catalogTitleId: titleId(t),
                        position: i + 1,
                        recommendedTmdbId: r.tmdbId,
                        recommendedTitleType: r.type,
                    })),
                ),
                (c) => tx.insert(tmdbRecommendations).values(c),
            );

            return {
                inserted: written.filter((w) => w.inserted).map((w) => w.slug),
                updated: written.filter((w) => !w.inserted).map((w) => w.slug),
            };
        });
    }

    async finalize(plan: FinalizePlan) {
        await this.db.transaction(async (tx) => {
            const services = await tx.select().from(streamingServices);
            const serviceId = new Map(services.map((s) => [s.tmdbId, s.id]));

            for (const c of chunks(plan.availabilityToRemove)) {
                const pairs = sql.join(
                    c.map((a) => sql`(${a.titleId}, ${serviceId.get(a.streamingTmdbId)!})`),
                    sql`, `,
                );
                await tx
                    .delete(streamingAvailability)
                    .where(
                        and(
                            eq(streamingAvailability.countryCode, COUNTRY),
                            sql`(${streamingAvailability.catalogTitleId}, ${streamingAvailability.streamingServiceId}) in (${pairs})`,
                        ),
                    );
            }
            for (const c of chunks(plan.availabilityToAdd)) {
                await tx.insert(streamingAvailability).values(
                    c.map((a) => ({
                        catalogTitleId: a.titleId,
                        streamingServiceId: serviceId.get(a.streamingTmdbId)!,
                        countryCode: COUNTRY,
                    })),
                );
            }

            const setWhere = async (
                ids: number[],
                set: Partial<typeof catalogTitles.$inferInsert>,
            ) => {
                for (const c of chunks(ids)) {
                    await tx.update(catalogTitles).set(set).where(inArray(catalogTitles.id, c));
                }
            };
            await setWhere(plan.reactivateIds, { isActive: true });
            await setWhere(plan.inactivateIds, { isActive: false });
            await setWhere(plan.recommendableIds, { isRecommendable: true });
            await setWhere(plan.notRecommendableIds, { isRecommendable: false });

            for (const c of chunks(plan.deleteIds)) {
                await tx
                    .delete(catalogTitleGenres)
                    .where(inArray(catalogTitleGenres.catalogTitleId, c));
                await tx
                    .delete(catalogTitleThemeKeywords)
                    .where(inArray(catalogTitleThemeKeywords.catalogTitleId, c));
                await tx.delete(titleCredits).where(inArray(titleCredits.catalogTitleId, c));
                await tx
                    .delete(catalogTitleProductionCompanies)
                    .where(inArray(catalogTitleProductionCompanies.catalogTitleId, c));
                await tx
                    .delete(tmdbRecommendations)
                    .where(inArray(tmdbRecommendations.catalogTitleId, c));
                await tx
                    .delete(titleNeighbors)
                    .where(
                        or(
                            inArray(titleNeighbors.catalogTitleId, c),
                            inArray(titleNeighbors.neighborTitleId, c),
                        ),
                    );
                await tx
                    .delete(streamingAvailability)
                    .where(inArray(streamingAvailability.catalogTitleId, c));
                await tx.delete(catalogTitles).where(inArray(catalogTitles.id, c));
            }
        });
    }
}

// Nomes fixos deste arquivo, nunca dado de fora (C6).
const TAG_TABLES = new Map<unknown, string>([
    [genres, "genres"],
    [themeKeywords, "theme_keywords"],
    [productionCompanies, "production_companies"],
]);

async function upsertTags(
    tx: Tx,
    table: typeof genres | typeof themeKeywords | typeof productionCompanies,
    tags: Tag[],
    updateName: boolean,
) {
    const ids = new Map<number, number>();
    for (const chunk of chunks(tags)) {
        const insert = tx
            .insert(table)
            .values(chunk.map((t) => ({ tmdbId: t.tmdbId, name: t.name })));
        await (updateName
            ? insert.onConflictDoUpdate({
                  target: table.tmdbId,
                  set: { name: excluded("name") },
                  setWhere: sql.raw(`${TAG_TABLES.get(table)}.name is distinct from excluded.name`),
              })
            : insert.onConflictDoNothing());
        const rows = await tx
            .select({ id: table.id, tmdbId: table.tmdbId })
            .from(table)
            .where(
                inArray(
                    table.tmdbId,
                    chunk.map((t) => t.tmdbId),
                ),
            );
        for (const r of rows) ids.set(r.tmdbId, r.id);
    }
    return ids;
}

async function upsertPeople(tx: Tx, credits: { tmdbPersonId: number; name: string }[]) {
    const ids = new Map<number, number>();
    for (const chunk of chunks(credits)) {
        await tx
            .insert(people)
            .values(chunk.map((c) => ({ tmdbPersonId: c.tmdbPersonId, name: c.name })))
            .onConflictDoUpdate({
                target: people.tmdbPersonId,
                set: { name: excluded("name") },
                setWhere: sql`${people.name} is distinct from excluded.name`,
            });
        const rows = await tx
            .select({ id: people.id, tmdbId: people.tmdbPersonId })
            .from(people)
            .where(
                inArray(
                    people.tmdbPersonId,
                    chunk.map((c) => c.tmdbPersonId),
                ),
            );
        for (const r of rows) ids.set(r.tmdbId, r.id);
    }
    return ids;
}
