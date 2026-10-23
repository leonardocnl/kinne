import "server-only";
import type { CatalogEntry, TitlesRepository } from "@/application/titles";
import type { TitleType } from "@/domain/catalog";
import { ADULT_CERTIFICATION } from "@/domain/catalog-sync";
import { CAST_SHOWN, MAX_DIRECTORS } from "@/domain/credits";
import { feelingMask, type FeelingData } from "@/domain/feelings";
import { isKinneGenre } from "@/domain/genre";
import { and, asc, eq, lt, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
    catalogTitleGenres,
    catalogTitles,
    catalogTitleThemeKeywords,
    genres,
    people,
    streamingAvailability,
    streamingServices,
    themeKeywords,
    titleCredits,
    titleNeighbors,
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
                // só para o bit de cada sentimento (US008 RNE004); não sai desta classe
                genreTmdbIds: sql<(number | null)[]>`array_agg(distinct ${genres.tmdbId})`,
                certification: catalogTitles.certificationBr,
                streamingTmdbIds,
                adult: adultTitle,
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
            // Recomendável (C7). Os 18 vêm marcados em `adult`: quem decide é o chip 18+ nos
            // filtros, e a surpresa os tira sempre (recommendation-rounds A2).
            .where(
                and(
                    eq(catalogTitles.isRecommendable, true),
                    // bloqueado à mão sai mesmo antes de a carga recalcular is_recommendable
                    eq(catalogTitles.isBlocked, false),
                ),
            )
            .groupBy(catalogTitles.id);
        return rows.map(({ genreTmdbIds, certification, ...r }) => ({
            ...r,
            type: r.type as TitleType,
            rating: Number(r.rating),
            kinneGenres: r.kinneGenres.filter((g) => g !== null && isKinneGenre(g)),
            feelings: feelingMask(
                genreTmdbIds.filter((id) => id !== null),
                certification,
            ),
        }));
    }

    /**
     * Gêneros, temas e classificação dos títulos recomendáveis em ids do TMDB, para a ordem do
     * sentimento (US008 RNE002). Só o servidor lê; o navegador recebe apenas o bit de cada um.
     */
    async feelingData(): Promise<FeelingData> {
        const recommendable = and(
            eq(catalogTitles.isRecommendable, true),
            eq(catalogTitles.isBlocked, false),
        );
        const [titles, genreRows, themeRows] = await Promise.all([
            this.db
                .select({ id: catalogTitles.id, certification: catalogTitles.certificationBr })
                .from(catalogTitles)
                .where(recommendable),
            this.db
                .select({ titleId: catalogTitleGenres.catalogTitleId, tmdbId: genres.tmdbId })
                .from(catalogTitleGenres)
                .innerJoin(genres, eq(genres.id, catalogTitleGenres.genreId))
                .innerJoin(catalogTitles, eq(catalogTitles.id, catalogTitleGenres.catalogTitleId))
                .where(recommendable),
            this.db
                .select({
                    titleId: catalogTitleThemeKeywords.catalogTitleId,
                    tmdbId: themeKeywords.tmdbId,
                    name: themeKeywords.name,
                })
                .from(catalogTitleThemeKeywords)
                .innerJoin(
                    themeKeywords,
                    eq(themeKeywords.id, catalogTitleThemeKeywords.themeKeywordId),
                )
                .innerJoin(
                    catalogTitles,
                    eq(catalogTitles.id, catalogTitleThemeKeywords.catalogTitleId),
                )
                .where(recommendable),
        ]);
        const byId = new Map(
            titles.map((t) => [
                t.id,
                {
                    id: t.id,
                    certification: t.certification,
                    genreTmdbIds: [] as number[],
                    themeTmdbIds: [] as number[],
                },
            ]),
        );
        for (const r of genreRows) byId.get(r.titleId)?.genreTmdbIds.push(r.tmdbId);
        const names = new Map<string, number>();
        for (const r of themeRows) {
            byId.get(r.titleId)?.themeTmdbIds.push(r.tmdbId);
            names.set(r.name.toLowerCase(), r.tmdbId);
        }
        return { profiles: [...byId.values()], themeIdsByName: [...names] };
    }

    /**
     * As arestas do grafo de gosto, cada uma uma vez (a gravação guarda os dois sentidos). Só o
     * servidor lê; o navegador nunca vê o grafo.
     */
    async neighborEdges(): Promise<{ a: number; b: number; proximity: number }[]> {
        const rows = await this.db
            .select({
                a: titleNeighbors.catalogTitleId,
                b: titleNeighbors.neighborTitleId,
                proximity: titleNeighbors.proximity,
            })
            .from(titleNeighbors)
            .where(lt(titleNeighbors.catalogTitleId, titleNeighbors.neighborTitleId));
        return rows;
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

/**
 * 18: os filtros só os mostram com o chip 18+, a surpresa nunca (recommendation-rounds A2). Sem
 * classificação conta como 18 (falha fechada): hoje is_recommendable já exige uma, mas esta é a
 * única marca entre esses títulos e a surpresa.
 */
export const adultTitle = sql<boolean>`coalesce(${catalogTitles.certificationBr} = ${ADULT_CERTIFICATION}, true)`;
