import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CastMember, CatalogEntry } from "@/application/titles";
import { formatRuntime, isSlug } from "@/domain/catalog";
import { joinNames } from "@/domain/credits";
import { GENRE_LABELS, mainGenre } from "@/domain/genre";
import { availableStreamings, type StreamingService } from "@/domain/streaming";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository } from "@/infrastructure/db/titles-repository";
import { CATALOG_TAG, titleTag } from "@/infrastructure/revalidation";

// Um título já pronto para a tela do título (US004 C1).
export type TitleScreen = {
    id: number;
    slug: string;
    title: string;
    tagline: string | null;
    synopsis: string | null;
    // na origem "dia" vira o gênero em que o título foi indicado
    genre: string | null;
    year: string | null;
    runtime: string | null;
    score: string;
    streamings: StreamingService[];
    trailerUrl: string | null;
    backdropImagePath: string | null;
    // pôster à esquerda do texto, só no computador
    posterImagePath: string | null;
    backdropWidth: number | null;
    // não recomendável: sem dado, sem "Outra opção" e fora dos buscadores (busca H6)
    recommendable: boolean;
    // "X", "X e Y" ou "X, Y e Z"; null quando não há diretor
    directors: string | null;
    // o elenco guardado, sem repetidos, com o personagem; vazio sem elenco (C12)
    cast: CastMember[];
};

/** O título do endereço, ou null se não existe. Em cache por slug: o catálogo muda uma vez por dia. */
export async function titleScreen(slug: string): Promise<TitleScreen | null> {
    // slugs são sempre assim; o resto nem chega ao banco nem ocupa o cache
    if (!isSlug(slug)) return null;
    return cachedTitleScreen(slug);
}

async function cachedTitleScreen(slug: string): Promise<TitleScreen | null> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, titleTag(slug));
    const entry = await new DrizzleTitlesRepository(createDb()).bySlug(slug);
    return entry && toTitleScreen(entry);
}

function toTitleScreen(t: CatalogEntry): TitleScreen {
    const genre = mainGenre(t.kinneGenres);
    return {
        id: t.id,
        slug: t.slug,
        title: t.title,
        tagline: t.tagline,
        synopsis: t.synopsis,
        genre: genre ? GENRE_LABELS[genre] : (t.genreNames[0] ?? null),
        year: t.releaseYear?.toString() ?? null,
        runtime: t.runtimeMinutes ? formatRuntime(t.runtimeMinutes, t.type) : null,
        score: t.rating.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        streamings: availableStreamings(t.streamingTmdbIds),
        trailerUrl: t.trailerYoutubeKey
            ? `https://www.youtube.com/watch?v=${encodeURIComponent(t.trailerYoutubeKey)}`
            : null,
        backdropImagePath: t.backdropImagePath,
        posterImagePath: t.posterImagePath,
        backdropWidth: t.backdropWidth,
        recommendable: t.recommendable,
        directors: joinNames(t.directors),
        cast: t.cast.filter((c, i) => t.cast.findIndex((o) => o.name === c.name) === i),
    };
}
