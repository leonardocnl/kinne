import { meetsQualityFloor } from "./catalog";
import type { FilterCandidate, TypeChoice } from "./filters";
import type { KinneGenre } from "./genre";
import { rankTitles, weightedRating } from "./rounds";
import { STREAMING_SERVICES, type Streaming } from "./streaming";
import { groupScores } from "./taste-graph";

// Sala de grupo (US011, docs/design/taste-graph.md §7). Regras puras: o código, as fases, quem
// pode começar, os finalistas, o vencedor e a passagem do papel de quem criou. O que fala com o
// banco está em infrastructure; a passagem do papel também existe em SQL (kinne_leave_group_room)
// e este arquivo é a especificação testável dela.

// ---------------------------------------------------------------------------------------------
// Código (RNE001)

// 31 símbolos: os dígitos de 2 a 9 e as letras, sem I, L e O (que se confundem com 1 e 0).
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 8;

// O maior múltiplo do alfabeto que cabe num byte: acima dele o byte é descartado, para que todos
// os símbolos saiam com a mesma chance (sem viés de módulo).
const UNBIASED_LIMIT = 256 - (256 % CODE_ALPHABET.length);

/**
 * Gera o código com bytes de um gerador criptográfico (`crypto.getRandomValues` no servidor).
 * `randomBytes(n)` devolve n bytes aleatórios.
 */
export function generateCode(randomBytes: (length: number) => Uint8Array): string {
    let code = "";
    while (code.length < CODE_LENGTH) {
        for (const byte of randomBytes(CODE_LENGTH * 2)) {
            if (byte < UNBIASED_LIMIT && code.length < CODE_LENGTH) {
                code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
            }
        }
    }
    return code;
}

/** `XXXX-XXXX`, como a tela mostra. */
export const formatCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * O que a pessoa digitou ou o QR trouxe: com ou sem hífen, em maiúsculas ou minúsculas. Qualquer
 * outra coisa devolve null (o mesmo erro de uma sala que não existe, RNE003).
 */
export function normalizeCode(input: unknown): string | null {
    if (typeof input !== "string" || input.length > 32) return null;
    const code = input.replace(/[\s-]/g, "").toUpperCase();
    return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c))
        ? code
        : null;
}

// ---------------------------------------------------------------------------------------------
// Fases, limites e prazos

export const ROOM_PHASES = ["lobby", "voting", "result"] as const;
export type RoomPhase = (typeof ROOM_PHASES)[number];

export const MAX_MEMBERS = 8; // RNE008
export const MAX_ROUNDS = 3; // RNE008
export const MIN_READY_TO_START = 2; // C6
export const MIN_FINALISTS = 3; // RNE005
export const MAX_FINALISTS = 5; // RNE005
export const ROOM_TTL_MS = 3 * 60 * 60 * 1000; // C10
export const RESULT_TTL_MS = 30 * 60 * 1000; // C10

/** Quando a sala expira: 3 h depois de criada, ou 30 min depois do resultado, o que vier antes. */
export function roomExpiry(createdAt: Date, resultAt: Date | null): Date {
    const end = createdAt.getTime() + ROOM_TTL_MS;
    return new Date(resultAt ? Math.min(end, resultAt.getTime() + RESULT_TTL_MS) : end);
}

export const roomExpired = (expiresAt: Date, now: Date) => expiresAt.getTime() <= now.getTime();

/** "Ver as opções" fica ativo com pelo menos duas pessoas prontas (C6). */
export const canStart = (members: readonly { ready: boolean }[]) =>
    members.filter((m) => m.ready).length >= MIN_READY_TO_START;

// ---------------------------------------------------------------------------------------------
// Passagem do papel de quem criou (C11, RNE010)

export type Seat = { id: number; position: number; left: boolean };

/**
 * A pessoa mais antiga ainda na sala (menor ordem de entrada) herda o papel de quem criou; null
 * quando não sobrou ninguém e a sala encerra. É o que kinne_leave_group_room faz em SQL.
 */
export function nextCreator(members: readonly Seat[], leavingId: number): number | null {
    const staying = members
        .filter((m) => !m.left && m.id !== leavingId)
        .sort((a, b) => a.position - b.position);
    return staying[0]?.id ?? null;
}

// ---------------------------------------------------------------------------------------------
// Finalistas (RNE005)

/** O que cada pessoa topa e o que o servidor sabe dela. */
export type MemberInput = {
    streamings: readonly Streaming[];
    genres: readonly KinneGenre[];
    watched: readonly number[];
    // pontuação do gosto (spreadTaste) sobre o grafo; vazia sem nenhum sinal
    scores: ReadonlyMap<number, number>;
};

export type RoomCriteria = {
    type: TypeChoice;
    maxRuntime: number | null;
};

export type Finalist<T> = { title: T; groupScore: number | null };

export type FinalistResult<T> =
    | { ok: true; finalists: Finalist<T>[] }
    // menos de 3 candidatos: a sala volta às preferências (RNE005)
    | { ok: false; candidates: number };

/**
 * Os candidatos da sala: recomendáveis no piso do catálogo (US002), sem classificação 18, em ao
 * menos um streaming marcado por alguém (o grupo assiste numa tela só; ninguém marcou, vale
 * todos, RNG003), com um gênero aceito por cada pessoa que marcou gêneros, no tipo e na duração
 * de quem criou e fora do "Já vi" de cada pessoa. Os de rodadas anteriores não voltam (C9).
 */
export function roomCandidates<T extends FilterCandidate>(
    titles: readonly T[],
    members: readonly Pick<MemberInput, "streamings" | "genres" | "watched">[],
    criteria: RoomCriteria,
    previous: ReadonlySet<number> = new Set(),
): T[] {
    const marked = new Set(members.flatMap((m) => m.streamings));
    const wanted: number[] = STREAMING_SERVICES.filter(
        (s) => marked.size === 0 || marked.has(s.id),
    ).map((s) => s.tmdbId);
    const watched = new Set(members.flatMap((m) => m.watched));
    const limit = criteria.type === "movie" ? criteria.maxRuntime : null;
    const acceptedBy = (genres: readonly KinneGenre[], t: T) =>
        genres.length === 0 ||
        // Romance só traz filmes (RNG007)
        genres.some((g) => t.kinneGenres.includes(g) && (g !== "romance" || t.type === "movie"));
    return titles.filter(
        (t) =>
            !t.adult &&
            meetsQualityFloor(t.rating, t.votes) &&
            t.streamingTmdbIds.some((id) => wanted.includes(id)) &&
            (criteria.type === "both" || t.type === criteria.type) &&
            members.every((m) => acceptedBy(m.genres, t)) &&
            // sem duração conhecida, não dá para garantir o teto
            (limit === null || (t.runtimeMinutes !== null && t.runtimeMinutes <= limit)) &&
            !watched.has(t.id) &&
            !previous.has(t.id),
    );
}

/**
 * De 3 a 5 finalistas. A ordem é o percentil do membro menos satisfeito (groupScores); quem não
 * tem sinais não restringe, e sem sinal em ninguém vale a nota ponderada. Empate vai para a nota
 * ponderada e depois para o menor id, para a mesma entrada dar sempre os mesmos finalistas.
 */
export function pickFinalists<T extends FilterCandidate>(
    titles: readonly T[],
    members: readonly MemberInput[],
    criteria: RoomCriteria,
    previous: ReadonlySet<number> = new Set(),
    mean: number,
): FinalistResult<T> {
    const candidates = roomCandidates(titles, members, criteria, previous);
    if (candidates.length < MIN_FINALISTS) return { ok: false, candidates: candidates.length };

    const group = groupScores(
        members.map((m) => m.scores),
        candidates.map((t) => t.id),
    );
    const quality = (t: T) => weightedRating(t.rating, t.votes, mean);
    const ranked =
        group.size === 0
            ? rankTitles(candidates, mean)
            : [...candidates].sort(
                  (a, b) =>
                      group.get(b.id)! - group.get(a.id)! || quality(b) - quality(a) || a.id - b.id,
              );
    return {
        ok: true,
        finalists: ranked.slice(0, MAX_FINALISTS).map((title) => ({
            title,
            groupScore: group.get(title.id) ?? null,
        })),
    };
}

// ---------------------------------------------------------------------------------------------
// Votação e resultado (RNE006)

export type Tally = {
    titleId: number;
    approvals: number;
    groupScore: number | null;
    quality: number;
};

/**
 * O finalista com mais "Eu toparia"; empate vai para a maior pontuação do grupo e depois para a
 * nota ponderada. Null quando nenhum teve voto: "Ninguém topou nenhum" (C9).
 */
export function pickWinner(tallies: readonly Tally[]): number | null {
    const best = [...tallies].sort(
        (a, b) =>
            b.approvals - a.approvals ||
            (b.groupScore ?? -1) - (a.groupScore ?? -1) ||
            b.quality - a.quality ||
            a.titleId - b.titleId,
    )[0];
    return best && best.approvals > 0 ? best.titleId : null;
}

/** A votação acaba quando todas as pessoas na sala votaram (C8). */
export const everyoneVoted = (voted: number, inRoom: number) => inRoom > 0 && voted >= inRoom;
