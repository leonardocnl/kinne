import { cacheLife } from "next/cache";
import type { CatalogEntry } from "@/application/titles";
import { formatRuntime } from "@/domain/catalog";
import { GENRE_LABELS, mainGenre } from "@/domain/genre";
import { primaryStreaming, type StreamingService } from "@/domain/streaming";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository } from "@/infrastructure/db/titles-repository";

// Um título já pronto para a tela do título (US004 C1).
export type TitleScreen = {
    id: number;
    slug: string;
    title: string;
    tagline: string | null;
    synopsis: string | null;
    // separado dos facts: na origem "dia" vira o gênero em que o título foi indicado
    genre: string | null;
    // ano e duração, sem os que faltam
    facts: string[];
    score: string;
    streaming: StreamingService | null;
    trailerUrl: string | null;
    backdropImagePath: string | null;
};

/** O título do endereço, ou null se não existe. Em cache por slug: o catálogo muda uma vez por dia. */
export async function titleScreen(slug: string): Promise<TitleScreen | null> {
    // slugs são sempre assim; o resto nem chega ao banco nem ocupa o cache
    if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
    return cachedTitleScreen(slug);
}

async function cachedTitleScreen(slug: string): Promise<TitleScreen | null> {
    "use cache: remote";
    cacheLife("days");
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
        facts: [
            t.releaseYear?.toString(),
            t.runtimeMinutes ? formatRuntime(t.runtimeMinutes, t.type) : undefined,
        ].filter((fact) => fact !== undefined),
        score: t.rating.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        streaming: primaryStreaming(t.streamingTmdbIds),
        trailerUrl: t.trailerYoutubeKey
            ? `https://www.youtube.com/watch?v=${encodeURIComponent(t.trailerYoutubeKey)}`
            : null,
        backdropImagePath: t.backdropImagePath,
    };
}
