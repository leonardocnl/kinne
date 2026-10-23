import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { TitleType } from "@/domain/catalog";
import type { Edge, TitleProfile } from "@/domain/taste-graph";

import type { connectSyncDb } from "./catalog-repository";
import {
    catalogTitleGenres,
    catalogTitleProductionCompanies,
    catalogTitles,
    catalogTitleThemeKeywords,
    genres,
    productionCompanies,
    themeKeywords,
    titleCredits,
    titleNeighbors,
    tmdbRecommendations,
} from "./schema";

type SyncDb = Awaited<ReturnType<typeof connectSyncDb>>["db"];

const CHUNK = 2000;
const chunks = <T>(items: readonly T[]) =>
    Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) =>
        items.slice(i * CHUNK, (i + 1) * CHUNK),
    );

/** O que a calibração e a ordenação precisam além do vértice. */
export type ProfileRow = {
    profile: TitleProfile;
    name: string;
    year: number | null;
    rating: number;
    votes: number;
    certification: string | null;
    // gêneros e temas em ids do TMDB (as receitas dos sentimentos falam a língua do TMDB)
    genreTmdbIds: number[];
    themeTmdbIds: number[];
};

export type TasteGraphData = {
    rows: ProfileRow[];
    // nome do tema em minúsculas → id do TMDB
    themeIdsByName: Map<string, number>;
};

// direção e criação viram "autoria" no vértice; elenco não entra (design §3)
const AUTHOR_AND_WRITER = ["director", "creator", "writer"];

const recommendable = and(
    eq(catalogTitles.isRecommendable, true),
    eq(catalogTitles.isActive, true),
    eq(catalogTitles.isBlocked, false),
);

/** Lê os vértices do grafo e grava as arestas (docs/design/taste-graph.md §9). */
export class DrizzleTasteGraphRepository {
    constructor(private readonly db: SyncDb) {}

    /** Os títulos recomendáveis como TitleProfile, em seis consultas. */
    async load(): Promise<TasteGraphData> {
        const titles = await this.db
            .select({
                id: catalogTitles.id,
                tmdbId: catalogTitles.tmdbId,
                type: catalogTitles.titleType,
                name: catalogTitles.displayTitle,
                year: catalogTitles.releaseYear,
                rating: catalogTitles.tmdbAverageRating,
                votes: catalogTitles.tmdbVoteCount,
                certification: catalogTitles.certificationBr,
                seriesType: catalogTitles.seriesType,
                collectionId: catalogTitles.collectionTmdbId,
            })
            .from(catalogTitles)
            .where(recommendable);
        if (titles.length === 0) return { rows: [], themeIdsByName: new Map() };

        // ids internos do Kinne no vértice; os do TMDB à parte, para as receitas
        const ids = titles.map((t) => t.id);
        const [genreRows, themeRows, creditRows, companyRows, recommendationRows] =
            await Promise.all([
                this.db
                    .select({
                        titleId: catalogTitleGenres.catalogTitleId,
                        genreId: genres.id,
                        tmdbId: genres.tmdbId,
                    })
                    .from(catalogTitleGenres)
                    .innerJoin(genres, eq(genres.id, catalogTitleGenres.genreId))
                    .innerJoin(
                        catalogTitles,
                        eq(catalogTitles.id, catalogTitleGenres.catalogTitleId),
                    )
                    .where(recommendable),
                this.db
                    .select({
                        titleId: catalogTitleThemeKeywords.catalogTitleId,
                        themeId: themeKeywords.id,
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
                this.db
                    .select({
                        titleId: titleCredits.catalogTitleId,
                        personId: titleCredits.personId,
                        role: titleCredits.role,
                    })
                    .from(titleCredits)
                    .innerJoin(catalogTitles, eq(catalogTitles.id, titleCredits.catalogTitleId))
                    .where(and(recommendable, inArray(titleCredits.role, AUTHOR_AND_WRITER))),
                this.db
                    .select({
                        titleId: catalogTitleProductionCompanies.catalogTitleId,
                        companyId: productionCompanies.id,
                    })
                    .from(catalogTitleProductionCompanies)
                    .innerJoin(
                        productionCompanies,
                        eq(
                            productionCompanies.id,
                            catalogTitleProductionCompanies.productionCompanyId,
                        ),
                    )
                    .innerJoin(
                        catalogTitles,
                        eq(catalogTitles.id, catalogTitleProductionCompanies.catalogTitleId),
                    )
                    .where(recommendable),
                this.db
                    .select({
                        titleId: tmdbRecommendations.catalogTitleId,
                        position: tmdbRecommendations.position,
                        tmdbId: tmdbRecommendations.recommendedTmdbId,
                        type: tmdbRecommendations.recommendedTitleType,
                    })
                    .from(tmdbRecommendations)
                    .innerJoin(
                        catalogTitles,
                        eq(catalogTitles.id, tmdbRecommendations.catalogTitleId),
                    )
                    .where(recommendable),
            ]);

        type Building = {
            themeIds: number[];
            genreIds: number[];
            authorIds: number[];
            writerIds: number[];
            companyIds: number[];
            recommended: { position: number; id: number }[];
            genreTmdbIds: number[];
            themeTmdbIds: number[];
        };
        const building = new Map<number, Building>(
            ids.map((id) => [
                id,
                {
                    themeIds: [],
                    genreIds: [],
                    authorIds: [],
                    writerIds: [],
                    companyIds: [],
                    recommended: [],
                    genreTmdbIds: [],
                    themeTmdbIds: [],
                },
            ]),
        );
        const at = (id: number) => building.get(id);

        for (const r of genreRows) {
            at(r.titleId)?.genreIds.push(r.genreId);
            at(r.titleId)?.genreTmdbIds.push(r.tmdbId);
        }
        const themeIdsByName = new Map<string, number>();
        for (const r of themeRows) {
            at(r.titleId)?.themeIds.push(r.themeId);
            at(r.titleId)?.themeTmdbIds.push(r.tmdbId);
            themeIdsByName.set(r.name.toLowerCase(), r.tmdbId);
        }
        for (const r of creditRows) {
            const b = at(r.titleId);
            if (!b) continue;
            if (r.role === "writer") b.writerIds.push(r.personId);
            else b.authorIds.push(r.personId);
        }
        for (const r of companyRows) at(r.titleId)?.companyIds.push(r.companyId);

        // taste-graph-data A2: só recomendações que caem em títulos recomendáveis
        const catalogId = new Map(titles.map((t) => [`${t.type}:${t.tmdbId}`, t.id]));
        for (const r of recommendationRows) {
            const id = catalogId.get(`${r.type}:${r.tmdbId}`);
            if (id !== undefined) at(r.titleId)?.recommended.push({ position: r.position, id });
        }

        const rows = titles.map((t): ProfileRow => {
            const b = building.get(t.id)!;
            return {
                profile: {
                    id: t.id,
                    type: t.type as TitleType,
                    themeIds: b.themeIds,
                    genreIds: b.genreIds,
                    authorIds: b.authorIds,
                    writerIds: b.writerIds,
                    companyIds: b.companyIds,
                    seriesType: t.seriesType,
                    collectionId: t.collectionId,
                    recommendedIds: b.recommended
                        .sort((x, y) => x.position - y.position)
                        .map((r) => r.id),
                },
                name: t.name,
                year: t.year,
                rating: Number(t.rating),
                votes: t.votes,
                certification: t.certification,
                genreTmdbIds: b.genreTmdbIds,
                themeTmdbIds: b.themeTmdbIds,
            };
        });
        return { rows, themeIdsByName };
    }

    /** Troca o grafo inteiro numa transação: se falhar, fica o de ontem (taste-graph-data C4). */
    async replaceNeighbors(edges: readonly Edge[]): Promise<number> {
        const rows = edges.flatMap((e) => {
            const values = {
                proximity: e.proximity,
                contentScore: e.content,
                recommendationScore: e.recommendation,
            };
            return [
                { catalogTitleId: e.a, neighborTitleId: e.b, ...values },
                { catalogTitleId: e.b, neighborTitleId: e.a, ...values },
            ];
        });
        await this.db.transaction(async (tx) => {
            await tx.delete(titleNeighbors).where(sql`true`);
            for (const c of chunks(rows)) await tx.insert(titleNeighbors).values(c);
        });
        return rows.length;
    }
}
