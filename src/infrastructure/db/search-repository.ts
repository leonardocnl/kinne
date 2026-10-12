import { and, desc, eq, or, sql } from "drizzle-orm";
import type { Admission, CachedAnswer, CounterName, TmdbHit } from "@/application/title-search";
import type { TitleType } from "@/domain/catalog";
import { ADULT_CERTIFICATION } from "@/domain/catalog-sync";
import { escapeLike, MAX_RESULTS, type SearchResult } from "@/domain/search";
import type { Db } from "./client";
import { takeTokens } from "./rate-limiter";
import { catalogTitles, circuitBreakers, searchCache, searchCounters } from "./schema";

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
    certification: catalogTitles.certificationBr,
};

// G9: inativos e bloqueados nunca aparecem.
export const visible = and(eq(catalogTitles.isActive, true), eq(catalogTitles.isBlocked, false));

// C4: título 18 aparece (a pessoa buscou por ele), mas sem imagem até existir o chip 18+. Sem
// classificação conhecida também fica sem imagem: é onde o conteúdo adulto escapa (sync A7).
export function toResult({ certification, ...row }: Row): SearchResult {
    return {
        ...row,
        type: row.type as TitleType,
        posterPath:
            certification === null || certification === ADULT_CERTIFICATION ? null : row.posterPath,
    };
}
type Row = {
    slug: string;
    title: string;
    year: number | null;
    type: string;
    posterPath: string | null;
    certification: string | null;
};

export class DrizzleSearchRepository {
    constructor(private readonly db: Db) {}

    async catalog(term: string): Promise<SearchResult[]> {
        // G14: kinne_normalize dos dois lados, a mesma função do índice (A1, A2: só parâmetros)
        const needle = sql`kinne_normalize(${escapeLike(term)})`;
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
                ["search:tmdb:day", limits.tmdbPerDay, limits.tmdbPerDay / 86_400],
            ],
            BREAKER,
        );
    }

    async tripBreaker(): Promise<void> {
        const openUntil = sql`now() + ${BREAKER_COOLDOWN}::interval`;
        await this.db
            .insert(circuitBreakers)
            .values({ name: BREAKER, openUntil })
            .onConflictDoUpdate({ target: circuitBreakers.name, set: { openUntil } });
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
