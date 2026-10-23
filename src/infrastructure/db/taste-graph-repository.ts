import "server-only";
import { and, eq, inArray } from "drizzle-orm";

import { CAST_LIMIT, type GraphTitle } from "@/domain/taste-graph";

import type { Db } from "./client";
import {
    catalogTitleGenres,
    catalogTitles,
    catalogTitleThemeKeywords,
    genres,
    themeKeywords,
    titleCredits,
} from "./schema";

export type TasteGraphData = {
    titles: GraphTitle[];
    // nome do tema em minúsculas → id do TMDB, para resolver as receitas dos sentimentos
    keywordIdsByName: Map<string, number>;
};

/** Carrega do catálogo tudo o que o grafo de gosto precisa, em quatro consultas. */
export class DrizzleTasteGraphRepository {
    constructor(private readonly db: Db) {}

    async load(): Promise<TasteGraphData> {
        const titleRows = await this.db
            .select({ id: catalogTitles.id })
            .from(catalogTitles)
            .where(and(eq(catalogTitles.isActive, true), eq(catalogTitles.isBlocked, false)));
        const ids = titleRows.map((r) => r.id);
        const byId = new Map<number, GraphTitle>(
            ids.map((id) => [
                id,
                { id, genreTmdbIds: [], keywordTmdbIds: [], directorIds: [], castIds: [] },
            ]),
        );
        if (ids.length === 0) return { titles: [], keywordIdsByName: new Map() };

        const [genreRows, keywordRows, creditRows] = await Promise.all([
            this.db
                .select({ titleId: catalogTitleGenres.catalogTitleId, tmdbId: genres.tmdbId })
                .from(catalogTitleGenres)
                .innerJoin(genres, eq(genres.id, catalogTitleGenres.genreId))
                .where(inArray(catalogTitleGenres.catalogTitleId, ids)),
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
                .where(inArray(catalogTitleThemeKeywords.catalogTitleId, ids)),
            this.db
                .select({
                    titleId: titleCredits.catalogTitleId,
                    personId: titleCredits.personId,
                    role: titleCredits.role,
                    order: titleCredits.creditOrder,
                })
                .from(titleCredits)
                .where(inArray(titleCredits.catalogTitleId, ids)),
        ]);

        type MutableTitle = {
            genreTmdbIds: number[];
            keywordTmdbIds: number[];
            directorIds: number[];
            castIds: number[];
        };
        const mutable = (id: number) => byId.get(id) as MutableTitle | undefined;
        for (const r of genreRows) mutable(r.titleId)?.genreTmdbIds.push(r.tmdbId);
        const keywordIdsByName = new Map<string, number>();
        for (const r of keywordRows) {
            mutable(r.titleId)?.keywordTmdbIds.push(r.tmdbId);
            keywordIdsByName.set(r.name.toLowerCase(), r.tmdbId);
        }
        const sortedCredits = [...creditRows].sort((a, b) => a.order - b.order);
        for (const r of sortedCredits) {
            const title = mutable(r.titleId);
            if (!title) continue;
            if (r.role === "director") title.directorIds.push(r.personId);
            else if (title.castIds.length < CAST_LIMIT) title.castIds.push(r.personId);
        }
        return { titles: [...byId.values()], keywordIdsByName };
    }
}
