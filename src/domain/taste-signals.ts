import type { TasteSignal } from "./taste-graph";

// Os sinais de gosto que o navegador guarda (US009 RNE001): listas de ids de título, no
// localStorage. Ficam no navegador e só saem dentro de um pedido de sorteio (US010 RNE002).

/** Cada lista guarda os 200 sinais mais recentes (feelings-and-taste-ui A3). */
export const TASTE_LIST_MAX = 200;
// Maior id que cabe no inteiro do banco: acima disso não é id de título.
export const MAX_TITLE_ID = 2_147_483_647;

export type TasteLists = {
    liked: number[];
    willWatch: number[];
    disliked: number[];
};

/** Os sinais que a tela grava; "não me interessa" não tem botão nesta versão (04, 23/10/2026). */
export type RecordedSignal = "liked" | "will_watch" | "disliked";

export const EMPTY_TASTE: TasteLists = { liked: [], willWatch: [], disliked: [] };

const LIST_OF = { liked: "liked", will_watch: "willWatch", disliked: "disliked" } as const;

const isTitleId = (value: unknown): value is number =>
    Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= MAX_TITLE_ID;

/** Sem repetir, mantendo a última aparição, e só os 200 mais recentes. */
const clean = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    const ids = value.filter(isTitleId);
    const unique = ids.filter((id, i) => ids.lastIndexOf(id) === i);
    return unique.slice(-TASTE_LIST_MAX);
};

/**
 * Qualquer coisa vinda de fora (localStorage mexido à mão, corpo de um pedido) vira listas
 * válidas: só inteiros positivos, sem repetição, até 200 por lista. Um título que aparece em
 * mais de uma lista fica na mais negativa: não curti, depois vou assistir, depois curti (A3).
 */
export function normalizeTaste(value: unknown): TasteLists {
    const raw =
        typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
    const disliked = clean(raw.disliked);
    const dislikedSet = new Set(disliked);
    const willWatch = clean(raw.willWatch).filter((id) => !dislikedSet.has(id));
    const willWatchSet = new Set(willWatch);
    const liked = clean(raw.liked).filter((id) => !dislikedSet.has(id) && !willWatchSet.has(id));
    return { liked, willWatch, disliked };
}

/** Grava um sinal: o título sai das outras listas (o mais recente vale) e vai para o fim da sua. */
export function recordSignal(lists: TasteLists, id: number, signal: RecordedSignal): TasteLists {
    if (!isTitleId(id)) return lists;
    const without = (list: number[]) => list.filter((x) => x !== id);
    const next: TasteLists = {
        liked: without(lists.liked),
        willWatch: without(lists.willWatch),
        disliked: without(lists.disliked),
    };
    next[LIST_OF[signal]] = [...next[LIST_OF[signal]], id].slice(-TASTE_LIST_MAX);
    return next;
}

/** As listas como o grafo as lê (spreadTaste). */
export function toSignals(lists: TasteLists): { titleId: number; signal: TasteSignal }[] {
    return [
        ...lists.liked.map((titleId) => ({ titleId, signal: "liked" as const })),
        ...lists.willWatch.map((titleId) => ({ titleId, signal: "will_watch" as const })),
        ...lists.disliked.map((titleId) => ({ titleId, signal: "disliked" as const })),
    ];
}

/** Só sinal positivo muda a ordem (US009 C1, C2): sem ele, tudo segue como hoje. */
export const hasPositiveSignal = (lists: TasteLists): boolean =>
    lists.liked.length > 0 || lists.willWatch.length > 0;
