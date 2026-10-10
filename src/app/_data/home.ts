import { cacheLife } from "next/cache";
import { dailyPicksFor, type DailyPickTitle } from "@/application/daily-picks";
import { formatRuntime } from "@/domain/catalog";
import { pickPhrase, rotationSeconds } from "@/domain/daily-picks";
import type { Day } from "@/domain/day";
import { GENRE_LABELS } from "@/domain/genre";
import { primaryStreaming, type StreamingService } from "@/domain/streaming";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleDailyPicksRepository } from "@/infrastructure/db/daily-picks-repository";

// Uma indicação já pronta para a tela inicial.
export type HomePick = {
    slug: string;
    title: string;
    genre: string;
    phrase: string;
    seconds: number;
    // gênero, ano e duração, nesta ordem, sem os que faltam
    facts: string[];
    streaming: StreamingService | null;
    backdropImagePath: string | null;
};

/**
 * Cópia diária da tela inicial (RNF07). O dia de Brasília é a chave: o banco só é consultado na
 * primeira visita de cada dia (ou depois de um deploy, que troca as chaves). "remote" guarda a
 * cópia no cache compartilhado da hospedagem, e não na memória de cada instância.
 */
export async function homePicks(day: Day): Promise<HomePick[]> {
    "use cache: remote";
    cacheLife("days");
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
        facts: [
            GENRE_LABELS[p.genre],
            p.releaseYear?.toString(),
            p.runtimeMinutes ? formatRuntime(p.runtimeMinutes, p.type) : undefined,
        ].filter((fact) => fact !== undefined),
        streaming: primaryStreaming(p.streamingTmdbIds),
        backdropImagePath: p.backdropImagePath,
    };
}
