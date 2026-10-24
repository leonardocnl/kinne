import type { FilterCandidate, TypeChoice } from "@/domain/filters";
import { isKinneGenre, type KinneGenre } from "@/domain/genre";
import {
    everyoneVoted,
    pickFinalists,
    pickWinner,
    roomExpired,
    type FinalistResult,
    type MemberInput,
    type Tally,
} from "@/domain/group-room";
import { meanRating, weightedRating } from "@/domain/rounds";
import { isStreaming, STREAMING_SERVICES, type Streaming } from "@/domain/streaming";
import { spreadTaste, type NeighborGraph } from "@/domain/taste-graph";
import { hasPositiveSignal, toSignals } from "@/domain/taste-signals";

// Sala de grupo (US011): os casos de uso, sobre um repositório que a infrastructure implementa.
// Quem pede é sempre uma pessoa achada pelo hash do cookie; nenhum id de membro entra por aqui.

/** O que uma pessoa leva ao criar ou entrar na sala (RNE009). */
export type MemberDetails = {
    streamings: readonly Streaming[];
    genres: readonly KinneGenre[];
    watched: readonly number[];
    liked: readonly number[];
    willWatch: readonly number[];
    disliked: readonly number[];
};

export type RoomSettings = { typeChoice: TypeChoice; maxRuntime: number | null };

export type RoomSnapshot = {
    room: RoomSettings & {
        id: number;
        phase: "lobby" | "voting" | "result";
        round: number;
        expiresAt: string;
        resultAt: string | null;
        creatorMemberId: number | null;
        code: string | null;
    };
    me: { id: number; position: number; ready: boolean; streamings: string[]; genres: string[] };
    // os streamings marcados por alguém na sala, sem dizer por quem (RNE005)
    marked: string[];
    members: { id: number; position: number; ready: boolean; voted: boolean }[];
    finalists: {
        titleId: number;
        position: number;
        slug: string;
        title: string;
        year: number | null;
        poster: string | null;
        streamingTmdbIds: number[];
        approvals: number | null;
        mine: boolean | null;
    }[];
};

export type ProposalInput = {
    room: RoomSettings & { id: number; phase: string; round: number };
    members: {
        id: number;
        ready: boolean;
        streamings: string[];
        genres: string[];
        watched: number[];
        liked: number[];
        willWatch: number[];
        disliked: number[];
    }[];
    previous: number[];
};

export type StoredTally = {
    titleId: number;
    groupScore: number | null;
    rating: number;
    votes: number;
    approvals: number;
};

export type FinalistRows = { titleIds: number[]; scores: (number | null)[] };

export type CreateOutcome = { kind: "created" } | { kind: "limited" } | { kind: "code-taken" };

export interface GroupRoomRepository {
    create(input: {
        code: string;
        creatorKey: string;
        tokenHash: string;
        member: MemberDetails;
    }): Promise<CreateOutcome>;
    join(input: { code: string; tokenHash: string; member: MemberDetails }): Promise<boolean>;
    leave(tokenHash: string): Promise<"left" | "ended" | null>;
    purge(): Promise<void>;
    snapshot(tokenHash: string): Promise<RoomSnapshot | null>;
    proposalInput(tokenHash: string): Promise<ProposalInput | null>;
    tallies(tokenHash: string): Promise<StoredTally[]>;
    updatePreferences(input: {
        tokenHash: string;
        streamings: readonly Streaming[];
        genres: readonly KinneGenre[];
        ready: boolean;
    }): Promise<boolean>;
    updateSettings(input: { tokenHash: string } & RoomSettings): Promise<boolean>;
    startVoting(input: { tokenHash: string } & FinalistRows): Promise<boolean>;
    nextRound(input: { tokenHash: string } & FinalistRows): Promise<boolean>;
    castVote(input: { tokenHash: string; approved: readonly number[] }): Promise<boolean>;
    closeVoting(tokenHash: string): Promise<boolean>;
    closeIfEveryoneVoted(tokenHash: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------------------------
// Finalistas

export type FinalistDeps = {
    candidates: readonly FilterCandidate[];
    // null se o grafo não carregou: o grupo segue pela nota ponderada (US009 RNE006)
    graph: NeighborGraph | null;
};

/** Um spread por membro (no máximo 8) sobre o mesmo grafo, depois o percentil do menos satisfeito. */
export function computeFinalists(
    { candidates, graph }: FinalistDeps,
    input: ProposalInput,
): FinalistResult<FilterCandidate> {
    const members: MemberInput[] = input.members.map((m) => {
        const taste = { liked: m.liked, willWatch: m.willWatch, disliked: m.disliked };
        return {
            streamings: m.streamings.filter(isStreaming),
            genres: m.genres.filter(isKinneGenre),
            watched: m.watched,
            scores:
                graph && hasPositiveSignal(taste)
                    ? spreadTaste(graph, toSignals(taste))
                    : new Map<number, number>(),
        };
    });
    return pickFinalists(
        candidates,
        members,
        { type: input.room.typeChoice, maxRuntime: input.room.maxRuntime },
        new Set(input.previous),
        meanRating(candidates),
    );
}

const rows = (result: Extract<FinalistResult<FilterCandidate>, { ok: true }>): FinalistRows => ({
    titleIds: result.finalists.map((f) => f.title.id),
    scores: result.finalists.map((f) => f.groupScore),
});

export type StartOutcome =
    | { kind: "started" }
    // menos de 3 candidatos: a sala continua no saguão (RNE005)
    | { kind: "few-options" }
    // não é quem criou, fase errada, poucas pessoas prontas ou sala vencida
    | { kind: "refused" };

/** "Ver as opções" (C6) e "Outra rodada" (C9). */
export async function proposeFinalists(
    repository: GroupRoomRepository,
    deps: FinalistDeps,
    tokenHash: string,
    phase: "lobby" | "result",
): Promise<StartOutcome> {
    const input = await repository.proposalInput(tokenHash);
    if (!input || input.room.phase !== phase) return { kind: "refused" };
    // C9: as rodadas seguintes só vêm depois de um resultado, até a 3ª (RNE008)
    if (phase === "lobby" && input.members.filter((m) => m.ready).length < 2) {
        return { kind: "refused" };
    }
    const result = computeFinalists(deps, input);
    if (!result.ok) return { kind: "few-options" };
    const done =
        phase === "lobby"
            ? await repository.startVoting({ tokenHash, ...rows(result) })
            : await repository.nextRound({ tokenHash, ...rows(result) });
    return done ? { kind: "started" } : { kind: "refused" };
}

// ---------------------------------------------------------------------------------------------
// O que a tela vê

export type RoomView =
    // inexistente, vencida, ou a pessoa não está mais nela: "Esta sala terminou." (C10)
    | { kind: "ended" }
    | {
          kind: "room";
          phase: "lobby" | "voting" | "result";
          round: number;
          // só no saguão, para mostrar o código e o QR
          code: string | null;
          isCreator: boolean;
          me: { position: number; ready: boolean; streamings: Streaming[]; genres: KinneGenre[] };
          settings: RoomSettings;
          // as pessoas aparecem como "Pessoa N" (RNE004), sem nome nenhum
          people: { position: number; ready: boolean; voted: boolean; isMe: boolean }[];
          canStart: boolean;
          voted: number;
          finalists: {
              titleId: number;
              slug: string;
              title: string;
              year: number | null;
              poster: string | null;
              // onde o grupo assiste: os streamings do título entre os da sala
              where: Streaming[];
              mine: boolean | null;
              // só no resultado (C4)
              approvals: number | null;
              winner: boolean;
          }[];
          // só no resultado: ninguém topou (C9)
          nobody: boolean;
          canNextRound: boolean;
      };

const streamingsOf = (tmdbIds: readonly number[]): Streaming[] =>
    STREAMING_SERVICES.filter((s) => tmdbIds.includes(s.tmdbId)).map((s) => s.id);

/**
 * O estado da sala para uma pessoa. Aqui se garante C4: antes do resultado não sai total nenhum
 * por finalista, e nunca sai quem votou em quê, só quem já votou.
 */
export function buildRoomView(
    snapshot: RoomSnapshot,
    winnerId: number | null,
): Extract<RoomView, { kind: "room" }> {
    const { room, me, members } = snapshot;
    const isResult = room.phase === "result";
    const isCreator = room.creatorMemberId === me.id;
    // onde o grupo assiste: os marcados por alguém; ninguém marcou vale todos (RNG003)
    const marked = snapshot.marked.filter(isStreaming);
    const wanted = marked.length > 0 ? marked : STREAMING_SERVICES.map((s) => s.id);
    return {
        kind: "room",
        phase: room.phase,
        round: room.round,
        code: room.phase === "lobby" ? room.code : null,
        isCreator,
        me: {
            position: me.position,
            ready: me.ready,
            streamings: me.streamings.filter(isStreaming),
            genres: me.genres.filter(isKinneGenre),
        },
        settings: { typeChoice: room.typeChoice, maxRuntime: room.maxRuntime },
        people: members.map((m) => ({
            position: m.position,
            ready: m.ready,
            voted: room.phase === "lobby" ? false : m.voted,
            isMe: m.id === me.id,
        })),
        canStart: members.filter((m) => m.ready).length >= 2,
        voted: members.filter((m) => m.voted).length,
        finalists: snapshot.finalists.map((f) => ({
            titleId: f.titleId,
            slug: f.slug,
            title: f.title,
            year: f.year,
            poster: f.poster,
            where: streamingsOf(f.streamingTmdbIds).filter((s) => wanted.includes(s)),
            mine: room.phase === "lobby" ? null : f.mine,
            approvals: isResult ? f.approvals : null,
            winner: isResult && winnerId === f.titleId,
        })),
        nobody: isResult && winnerId === null,
        canNextRound: isCreator && isResult && room.round < 3,
    };
}

export type ViewDeps = {
    repository: GroupRoomRepository;
    now: () => Date;
    // a média das notas do catálogo, para a nota ponderada do desempate (RNE006)
    meanRating: () => Promise<number>;
};

/**
 * Lê a sala para quem pergunta. Uma sala vencida vale como encerrada e é apagada na hora (C2).
 * Se todas as pessoas na sala já votaram, a votação fecha aqui mesmo (C8).
 */
export async function loadRoom(deps: ViewDeps, tokenHash: string): Promise<RoomView> {
    let snapshot = await deps.repository.snapshot(tokenHash);
    if (!snapshot) return { kind: "ended" };
    if (roomExpired(new Date(snapshot.room.expiresAt), deps.now())) {
        await deps.repository.purge();
        return { kind: "ended" };
    }
    if (
        snapshot.room.phase === "voting" &&
        everyoneVoted(snapshot.members.filter((m) => m.voted).length, snapshot.members.length) &&
        (await deps.repository.closeIfEveryoneVoted(tokenHash))
    ) {
        snapshot = (await deps.repository.snapshot(tokenHash)) ?? snapshot;
    }
    let winnerId: number | null = null;
    if (snapshot.room.phase === "result") {
        const mean = await deps.meanRating();
        const tallies: Tally[] = (await deps.repository.tallies(tokenHash)).map((t) => ({
            titleId: t.titleId,
            approvals: t.approvals,
            groupScore: t.groupScore,
            quality: weightedRating(t.rating, t.votes, mean),
        }));
        winnerId = pickWinner(tallies);
    }
    return buildRoomView(snapshot, winnerId);
}
