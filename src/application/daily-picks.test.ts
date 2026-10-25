import { describe, expect, it } from "vitest";
import type { DailyPick, PickCandidate } from "@/domain/daily-picks";
import { DAILY_PICK_GENRES } from "@/domain/daily-picks";
import { parseDay, type Day } from "@/domain/day";
import {
    dailyPicksFor,
    generateDailyPicks,
    type DailyPickTitle,
    type DailyPicksRepository,
} from "./daily-picks";

const today = parseDay("2026-10-10");

const candidates: PickCandidate[] = DAILY_PICK_GENRES.flatMap((genre, g) =>
    [1, 2, 3].map((i) => ({
        id: g * 10 + i,
        type: "movie" as const,
        genres: [genre],
        rating: 7,
        votes: 2000,
        onStreaming: true,
    })),
);

// Repositório em memória, com a mesma regra do banco: o dia que já existe não muda.
function memoryRepository() {
    const days = new Map<Day, DailyPick[]>();
    let saves = 0;
    const repository: DailyPicksRepository = {
        async picksOf(day) {
            return (days.get(day) ?? []).toReversed().map((p): DailyPickTitle => ({
                genre: p.genre,
                slug: `titulo-${p.titleId}`,
                type: "movie",
                title: `Título ${p.titleId}`,
                tagline: null,
                synopsis: null,
                releaseYear: 2020,
                runtimeMinutes: 100,
                backdropImagePath: null,
                backdropWidth: null,
                streamingTmdbIds: [8],
            }));
        },
        async candidates() {
            return candidates;
        },
        async history() {
            return [...days].flatMap(([day, picks]) =>
                picks.map((p) => ({ day, titleId: p.titleId })),
            );
        },
        async saveDay(day, picks) {
            saves++;
            if (!days.has(day)) days.set(day, picks);
        },
    };
    return { repository, days, saves: () => saves };
}

describe("generateDailyPicks", () => {
    it("grava as cinco indicações do dia", async () => {
        const { repository, days } = memoryRepository();
        expect(await generateDailyPicks(today, repository)).toEqual({
            created: true,
            warnings: [],
        });
        expect(days.get(today)).toHaveLength(5);
    });

    it("não muda um dia que já existe", async () => {
        const { repository, days, saves } = memoryRepository();
        await generateDailyPicks(today, repository);
        const first = days.get(today);
        expect(await generateDailyPicks(today, repository)).toEqual({
            created: false,
            warnings: [],
        });
        expect(days.get(today)).toBe(first);
        expect(saves()).toBe(1);
    });

    it("não grava nada quando nenhum gênero tem candidato", async () => {
        const { repository, saves } = memoryRepository();
        repository.candidates = async () => [];
        const result = await generateDailyPicks(today, repository);
        expect(result.created).toBe(false);
        expect(result.warnings).toHaveLength(5);
        expect(saves()).toBe(0);
    });
});

describe("dailyPicksFor", () => {
    it("gera o dia que falta e devolve na ordem da tela", async () => {
        const { repository, days } = memoryRepository();
        const picks = await dailyPicksFor(today, repository);
        expect(days.has(today)).toBe(true);
        expect(picks.map((p) => p.genre)).toEqual([...DAILY_PICK_GENRES]);
    });
});
