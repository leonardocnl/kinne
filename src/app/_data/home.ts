import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { dailyPicksFor, type DailyPickTitle } from "@/application/daily-picks";
import { formatRuntime } from "@/domain/catalog";
import { pickPhrase, rotationSeconds } from "@/domain/daily-picks";
import type { Day } from "@/domain/day";
import { GENRE_LABELS } from "@/domain/genre";
import { availableStreamings, type StreamingService } from "@/domain/streaming";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleDailyPicksRepository } from "@/infrastructure/db/daily-picks-repository";
import { CATALOG_TAG, LISTS_TAG } from "@/infrastructure/revalidation";

// Uma indicação já pronta para a tela inicial.
export type HomePick = {
    slug: string;
    title: string;
    genre: string;
    phrase: string;
    seconds: number;
    year: string | null;
    // total; por episódio em séries
    runtime: string | null;
    streamings: StreamingService[];
    backdropImagePath: string | null;
    backdropWidth: number | null;
    // pôster da ficha, só no computador (como na tela do título)
    posterImagePath: string | null;
};

/**
 * Cópia diária da tela inicial (RNF07). O dia de Brasília é a chave: o banco só é consultado na
 * primeira visita de cada dia (ou depois de um deploy, que troca as chaves). "remote" guarda a
 * cópia no cache compartilhado da hospedagem, e não na memória de cada instância.
 */
export async function homePicks(day: Day): Promise<HomePick[]> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, LISTS_TAG);
    const picks = await dailyPicksFor(day, new DrizzleDailyPicksRepository(createDb()));
    return picks.map(toHomePick);
}

function toHomePick(p: DailyPickTitle): HomePick {
    const phrase = pickPhrase(p.tagline, p.synopsis);
    return {
        slug: p.slug,
        title: p.title,
        genre: GENRE_LABELS[p.genre],
        phrase,
        seconds: rotationSeconds(phrase),
        year: p.releaseYear?.toString() ?? null,
        runtime: p.runtimeMinutes ? formatRuntime(p.runtimeMinutes, p.type) : null,
        streamings: availableStreamings(p.streamingTmdbIds),
        backdropImagePath: p.backdropImagePath,
        backdropWidth: p.backdropWidth,
        posterImagePath: p.posterImagePath,
    };
}
