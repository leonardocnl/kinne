import "server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Admission, CachedAnswer, CounterName, TmdbHit } from "@/application/title-search";
import type { TitleType } from "@/domain/catalog";
import { MAX_RESULTS, type SearchResult } from "@/domain/search";
import type { Db } from "./client";
import { takeTokens } from "./rate-limiter";
import { catalogTitles, searchCache, searchCounters } from "./schema";

const CACHE_TTL = "24 hours"; // G5
// mais que o tempo limite do TMDB (3 s): a marca de quem caiu no meio libera o termo logo
const PENDING_TTL = "15 seconds";
const BREAKER = "tmdb_search";
const BREAKER_COOLDOWN = "5 minutes"; // B2
const STATEMENT_TIMEOUT = "2s"; // B4

export type Limits = { fallbackPerMinute: number; tmdbPerMinute: number; tmdbPerDay: number };

const columns = {
    slug: catalogTitles.slug,
    title: catalogTitles.displayTitle,
    year: catalogTitles.releaseYear,
    type: catalogTitles.titleType,
    posterPath: catalogTitles.posterImagePath,
};

// G9: inativos e bloqueados nunca aparecem.
export const visible = and(eq(catalogTitles.isActive, true), eq(catalogTitles.isBlocked, false));

// C4 (decisão da dona do produto): todo resultado mostra o pôster, inclusive 18 e sem
// classificação; 18 continua fora das indicações do dia e da surpresa.
const toResult = (row: { type: string } & Omit<SearchResult, "type">): SearchResult => ({
    ...row,
    type: row.type as TitleType,
});

// G14: kinne_normalize dos dois lados, a mesma função do índice. A2: os curingas do LIKE são
// escapados depois de normalizar, para que nenhuma regra do unaccent crie um curinga novo.
export const likeNeedle = (term: string) =>
    sql`replace(replace(replace(kinne_normalize(${term}), '\\', '\\\\'), '%', '\\%'), '_', '\\_')`;

export class DrizzleSearchRepository {
    constructor(private readonly db: Db) {}

    async catalog(term: string): Promise<SearchResult[]> {
        const needle = likeNeedle(term);
        const display = sql`kinne_normalize(${catalogTitles.displayTitle})`;
        const original = sql`kinne_normalize(${catalogTitles.originalTitle})`;
        const contains = sql`'%' || ${needle} || '%'`;
        const startsWith = sql`${needle} || '%'`;
        const [, rows] = await this.db.batch([
            this.db.execute(sql.raw(`set local statement_timeout = '${STATEMENT_TIMEOUT}'`)),
            this.db
                .select(columns)
                .from(catalogTitles)
                .where(
                    and(
                        visible,
                        sql`(${display} like ${contains} or ${original} like ${contains})`,
                    ),
                )
                .orderBy(
                    sql`(${display} like ${startsWith} or ${original} like ${startsWith}) desc`,
                    desc(catalogTitles.tmdbVoteCount),
                )
                .limit(MAX_RESULTS),
        ]);
        return rows.map(toResult);
    }

    async catalogByTmdb(hits: TmdbHit[]): Promise<SearchResult[]> {
        if (hits.length === 0) return [];
        const rows = await this.db
            .select(columns)
            .from(catalogTitles)
            .where(
                and(
                    visible,
                    or(
                        ...hits.map((h) =>
                            and(
                                eq(catalogTitles.tmdbId, h.tmdbId),
                                eq(catalogTitles.titleType, h.type),
                            ),
                        ),
                    ),
                ),
            )
            .orderBy(desc(catalogTitles.tmdbVoteCount))
            .limit(MAX_RESULTS);
        return rows.map(toResult);
    }

    async cached(termHash: string): Promise<CachedAnswer | null> {
        const [row] = await this.db
            .select({ status: searchCache.status, hits: searchCache.hits })
            .from(searchCache)
            .where(and(eq(searchCache.termHash, termHash), sql`${searchCache.expiresAt} > now()`));
        if (!row) return null;
        return row.status === "done"
            ? { status: "done", hits: row.hits ?? [] }
            : { status: "pending" };
    }

    async claim(termHash: string): Promise<boolean> {
        const rows = await this.db
            .insert(searchCache)
            .values({
                termHash,
                status: "pending",
                expiresAt: sql`now() + ${PENDING_TTL}::interval`,
            })
            .onConflictDoUpdate({
                target: searchCache.termHash,
                set: {
                    status: "pending",
                    hits: null,
                    createdAt: sql`now()`,
                    expiresAt: sql`excluded.expires_at`,
                },
                setWhere: sql`${searchCache.expiresAt} <= now()`,
            })
            .returning({ termHash: searchCache.termHash });
        return rows.length === 1;
    }

    async save(termHash: string, hits: TmdbHit[]): Promise<void> {
        const values = {
            status: "done",
            hits,
            createdAt: sql`now()`,
            expiresAt: sql`now() + ${CACHE_TTL}::interval`,
        };
        await this.db
            .insert(searchCache)
            .values({ termHash, ...values })
            .onConflictDoUpdate({ target: searchCache.termHash, set: values });
    }

    /** Uma ficha do visitante, da janela de um minuto e do dia, todas ou nenhuma (B1, G15). */
    async admit(clientKey: string, limits: Limits): Promise<Admission> {
        return takeTokens(
            this.db,
            [
                [
                    `search:client:${clientKey}`,
                    limits.fallbackPerMinute,
                    limits.fallbackPerMinute / 60,
                ],
                ["search:tmdb:minute", limits.tmdbPerMinute, limits.tmdbPerMinute / 60],
                // B1: orçamento do dia de calendário (UTC), sem reposição; a carga apaga o de ontem
                [`search:tmdb:day:${new Date().toISOString().slice(0, 10)}`, limits.tmdbPerDay, 0],
            ],
            BREAKER,
        );
    }

    async tripBreaker(): Promise<void> {
        await this.db.execute(
            sql`select kinne_trip_breaker(${BREAKER}, ${BREAKER_COOLDOWN}::interval)`,
        );
    }

    async addCounts(counts: ReadonlyMap<CounterName, number>): Promise<void> {
        if (counts.size === 0) return;
        await this.db
            .insert(searchCounters)
            .values(
                [...counts].map(([name, count]) => ({
                    day: sql`(now() at time zone 'America/Sao_Paulo')::date`,
                    name,
                    count,
                })),
            )
            .onConflictDoUpdate({
                target: [searchCounters.day, searchCounters.name],
                set: { count: sql`${searchCounters.count} + excluded.count` },
            });
    }
}
