"use server";

import "server-only";
import { cookies } from "next/headers";
import { loadRoom, proposeFinalists, type RoomView } from "@/application/group-room";
import { generateCode, normalizeCode, ROOM_TTL_MS } from "@/domain/group-room";
import { meanRating } from "@/domain/rounds";
import {
    cookieOptions,
    creatorKey,
    hashToken,
    newMemberToken,
    ROOM_COOKIE,
} from "@/infrastructure/group-room-session";
import { randomBytes } from "node:crypto";
import { searchConfig } from "@/infrastructure/search-config";
import { candidates } from "../_data/candidates";
import {
    admitIp,
    admitMember,
    createRoomSchema,
    joinRoomSchema,
    memberTokenHash,
    parseWith,
    preferencesSchema,
    roomRepository,
    voteSchema,
} from "../_data/room";
import { neighborGraphOrNull } from "../_data/taste-graph";

// Sala de grupo (US011). Toda ação é um ponto de entrada público: entrada estrita, cookie de
// membro como única identidade, e uma resposta curta e genérica quando algo não passa (security §6).
// Nada aqui escreve console: o código da sala, o cookie e os dados das pessoas nunca vão ao log.

export type RoomAnswer = { ok: true } | { ok: false };
const REFUSED = { ok: false } as const;
const OK = { ok: true } as const;

const fromNow = (ms: number) => new Date(Date.now() + ms);

async function setMemberCookie(token: string, expires: Date) {
    (await cookies()).set(ROOM_COOKIE, token, cookieOptions(expires));
}

/** "Criar uma sala" (C2): sorteia o código, cria a sala e põe a pessoa nela como quem criou. */
export async function createRoom(input: unknown): Promise<RoomAnswer> {
    const request = parseWith(createRoomSchema, input);
    const key = creatorKey(request?.browserId ?? "", searchConfig().secret);
    if (!request || !key || !(await admitIp("create"))) return REFUSED;
    const token = newMemberToken();
    const repository = roomRepository();
    // 31^8 códigos: uma colisão é raríssima, e três tentativas bastam
    for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateCode((n) => new Uint8Array(randomBytes(n)));
        const outcome = await repository.create({
            code,
            creatorKey: key,
            tokenHash: hashToken(token),
            member: request.member,
        });
        if (outcome.kind === "created") {
            await setMemberCookie(token, fromNow(ROOM_TTL_MS));
            return OK;
        }
        if (outcome.kind === "limited") return REFUSED;
    }
    return REFUSED;
}

/**
 * Entrar pelo código (C3, C4). Código inexistente, vencido, sala cheia e sala já começada dão a
 * mesma resposta (RNE003); o código nunca é gravado em log.
 */
export async function joinRoom(input: unknown): Promise<RoomAnswer> {
    const request = parseWith(joinRoomSchema, input);
    if (!request || !(await admitIp("join"))) return REFUSED;
    const code = normalizeCode(request.code);
    if (!code) return REFUSED;
    const token = newMemberToken();
    const joined = await roomRepository().join({
        code,
        tokenHash: hashToken(token),
        member: request.member,
    });
    if (!joined) return REFUSED;
    await setMemberCookie(token, fromNow(ROOM_TTL_MS));
    return OK;
}

/** Streamings, gêneros e "Pronto" de cada pessoa; tipo e duração só de quem criou (C5). */
export async function updatePreferences(input: unknown): Promise<RoomAnswer> {
    const request = parseWith(preferencesSchema, input);
    const tokenHash = await memberTokenHash();
    if (!request || !tokenHash || !admitMember(tokenHash)) return REFUSED;
    const repository = roomRepository();
    if (request.settings) {
        if (!(await repository.updateSettings({ tokenHash, ...request.settings }))) return REFUSED;
    }
    const done = await repository.updatePreferences({
        tokenHash,
        streamings: request.streamings,
        genres: request.genres,
        ready: request.ready,
    });
    return done ? OK : REFUSED;
}

export type StartAnswer = { ok: true } | { ok: false; reason: "few-options" | "refused" };

async function propose(phase: "lobby" | "result"): Promise<StartAnswer> {
    const tokenHash = await memberTokenHash();
    if (!tokenHash || !admitMember(tokenHash)) return { ok: false, reason: "refused" };
    const outcome = await proposeFinalists(
        roomRepository(),
        { candidates: await candidates(), graph: await neighborGraphOrNull() },
        tokenHash,
        phase,
    );
    if (outcome.kind === "started") return { ok: true };
    return { ok: false, reason: outcome.kind === "few-options" ? "few-options" : "refused" };
}

/** "Ver as opções" (C6): só quem criou, com duas pessoas prontas. */
export async function startRoom(): Promise<StartAnswer> {
    return propose("lobby");
}

/** "Outra rodada" (C9): só quem criou, depois do resultado. */
export async function nextRound(): Promise<StartAnswer> {
    return propose("result");
}

/** "Votar" (C7): quantos "Eu toparia" quiser; votar de novo troca a cédula. */
export async function vote(input: unknown): Promise<RoomAnswer> {
    const request = parseWith(voteSchema, input);
    const tokenHash = await memberTokenHash();
    if (!request || !tokenHash || !admitMember(tokenHash)) return REFUSED;
    const repository = roomRepository();
    if (!(await repository.castVote({ tokenHash, approved: request.titleIds }))) return REFUSED;
    // se foi a última pessoa a votar, o resultado sai agora (C8)
    await repository.closeIfEveryoneVoted(tokenHash);
    return OK;
}

/** "Encerrar votação" (C8): só quem criou. */
export async function closeVoting(): Promise<RoomAnswer> {
    const tokenHash = await memberTokenHash();
    if (!tokenHash || !admitMember(tokenHash)) return REFUSED;
    return (await roomRepository().closeVoting(tokenHash)) ? OK : REFUSED;
}

/** "Sair da sala" (C10, C11): o papel de quem criou passa à pessoa mais antiga na sala. */
export async function leaveRoom(): Promise<RoomAnswer> {
    const tokenHash = await memberTokenHash();
    (await cookies()).delete({ name: ROOM_COOKIE, path: "/sala" });
    if (!tokenHash) return OK;
    await roomRepository().leave(tokenHash);
    return OK;
}

export type RoomStateAnswer = RoomView | { kind: "limited" } | { kind: "none" };

/** O estado da sala para quem pergunta, a cada 2,5 s enquanto a aba está visível (RNE007). */
export async function roomState(): Promise<RoomStateAnswer> {
    const tokenHash = await memberTokenHash();
    // sem cookie a pessoa nunca esteve numa sala; com cookie e sem sala, ela terminou (C10)
    if (!tokenHash) return { kind: "none" };
    if (!admitMember(tokenHash)) return { kind: "limited" };
    return loadRoom(
        {
            repository: roomRepository(),
            now: () => new Date(),
            meanRating: async () => meanRating(await candidates()),
        },
        tokenHash,
    );
}
