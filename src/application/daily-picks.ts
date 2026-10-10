import type { TitleType } from "@/domain/catalog";
import {
    chooseDailyPicks,
    DAILY_PICK_GENRES,
    REPEAT_WINDOW_DAYS,
    type DailyPick,
    type PastPick,
    type PickCandidate,
} from "@/domain/daily-picks";
import { addDays, type Day } from "@/domain/day";
import type { KinneGenre } from "@/domain/genre";

// Uma indicação do dia, com o que a tela inicial mostra.
export type DailyPickTitle = {
    genre: KinneGenre;
    slug: string;
    type: TitleType;
    title: string;
    tagline: string | null;
    synopsis: string | null;
    releaseYear: number | null;
    runtimeMinutes: number | null;
    backdropImagePath: string | null;
    streamingTmdbIds: number[];
};

export interface DailyPicksRepository {
    // As indicações gravadas do dia, em qualquer ordem; vazio se o dia ainda não foi gerado.
    picksOf(day: Day): Promise<DailyPickTitle[]>;
    candidates(): Promise<PickCandidate[]>;
    // Indicações de `from` em diante.
    history(from: Day): Promise<PastPick[]>;
    // Grava as cinco de uma vez; se o dia já existe, não muda nada.
    saveDay(day: Day, picks: DailyPick[]): Promise<void>;
}

export type GenerateResult = { created: boolean; warnings: string[] };

// Idempotente: o sorteio é determinístico e a gravação ignora o dia que já existe, então duas
// gerações simultâneas gravam o mesmo resultado uma vez só.
export async function generateDailyPicks(
    day: Day,
    repository: DailyPicksRepository,
): Promise<GenerateResult> {
    if ((await repository.picksOf(day)).length > 0) return { created: false, warnings: [] };
    const [candidates, history] = await Promise.all([
        repository.candidates(),
        repository.history(addDays(day, -REPEAT_WINDOW_DAYS)),
    ]);
    const { picks, warnings } = chooseDailyPicks(day, candidates, history);
    await repository.saveDay(day, picks);
    return { created: true, warnings };
}

// As indicações do dia na ordem da tela. Plano B: se o daily:pick ainda não gerou o dia, gera
// na hora.
export async function dailyPicksFor(
    day: Day,
    repository: DailyPicksRepository,
): Promise<DailyPickTitle[]> {
    let picks = await repository.picksOf(day);
    if (picks.length === 0) {
        const { warnings } = await generateDailyPicks(day, repository);
        for (const warning of warnings) console.warn(warning);
        picks = await repository.picksOf(day);
    }
    return picks.toSorted(
        (a, b) => DAILY_PICK_GENRES.indexOf(a.genre) - DAILY_PICK_GENRES.indexOf(b.genre),
    );
}
