import "server-only";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import type { MemberDetails } from "@/application/group-room";
import { isKinneGenre, KINNE_GENRES, type KinneGenre } from "@/domain/genre";
import { RUNTIME_LIMITS, TYPES } from "@/domain/filters";
import { isStreaming, STREAMING_SERVICES, type Streaming } from "@/domain/streaming";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { isBrowserId } from "@/domain/usage-events";
import { clientKey, getClientIp } from "@/infrastructure/client-ip";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleGroupRoomRepository } from "@/infrastructure/db/group-room-repository";
import { takeTokens } from "@/infrastructure/db/rate-limiter";
import { hashToken, isMemberToken, ROOM_COOKIE } from "@/infrastructure/group-room-session";
import { MemoryLimiter } from "@/infrastructure/memory-limiter";
import { searchConfig } from "@/infrastructure/search-config";
import { idListSchema } from "./surprise";
import { tasteSchema } from "./taste";

export const roomRepository = () => new DrizzleGroupRoomRepository(createDb());

// ---------------------------------------------------------------------------------------------
// Entrada (group-room A1, B2): tudo estrito, listas fechadas, tamanhos limitados.

const unique = (list: readonly string[]) => new Set(list).size === list.length;

const streamingsSchema = z
    .array(z.custom<Streaming>((v) => typeof v === "string" && isStreaming(v)))
    .max(STREAMING_SERVICES.length)
    .refine(unique);
const genresSchema = z
    .array(z.custom<KinneGenre>((v) => typeof v === "string" && isKinneGenre(v)))
    .max(KINNE_GENRES.length)
    .refine(unique);

// Preferências de quem entra: o que ele topa, o "Já vi" e os sinais do navegador (RNE009).
const memberSchema = z
    .strictObject({
        streamings: streamingsSchema,
        genres: genresSchema,
        watched: idListSchema,
        taste: tasteSchema,
    })
    .transform((m): MemberDetails => ({
        streamings: m.streamings,
        genres: m.genres,
        // sem repetição, e um id só: o banco guarda no máximo 1000
        watched: [...new Set(m.watched)].slice(0, SURPRISE_MAX_EXCLUDED),
        liked: m.taste.liked,
        willWatch: m.taste.willWatch,
        disliked: m.taste.disliked,
    }));

const browserIdSchema = z.string().refine(isBrowserId);

export const createRoomSchema = z.strictObject({
    browserId: browserIdSchema,
    member: memberSchema,
});
export const joinRoomSchema = z.strictObject({
    // o código vem do QR ou do campo; fora do alfabeto vale como sala inexistente (RNE003)
    code: z.string().max(32),
    member: memberSchema,
});

const settingsSchema = z.strictObject({
    typeChoice: z.enum(TYPES as ["movie", "series", "both"]),
    maxRuntime: z.custom<number | null>((v) => RUNTIME_LIMITS.some((l) => l.minutes === v)),
});

export const preferencesSchema = z.strictObject({
    streamings: streamingsSchema,
    genres: genresSchema,
    ready: z.boolean(),
    // só quem criou muda (C5); de outra pessoa, a ação inteira é recusada (A3)
    settings: settingsSchema.nullable(),
});

export const voteSchema = z.strictObject({
    // no máximo 5 finalistas por rodada (RNE005)
    titleIds: z
        .array(z.int().positive().max(2_147_483_647))
        .max(5)
        .refine((ids) => new Set(ids).size === ids.length),
});

export function parseWith<T>(schema: z.ZodType<T, unknown>, input: unknown): T | null {
    const parsed = schema.safeParse(input);
    return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------------------------
// Quem pede

/** O hash do cookie de membro, ou null se o cookie falta ou está fora do formato. */
export async function memberTokenHash(): Promise<string | null> {
    const value = (await cookies()).get(ROOM_COOKIE)?.value;
    return isMemberToken(value) ? hashToken(value) : null;
}

// ---------------------------------------------------------------------------------------------
// Limites (group-room A1, D1, D2)

// Pedidos de quem já está na sala: ler o estado a cada 2,5 s e agir, por cookie e por instância.
const memberLimiter = new MemoryLimiter(
    () => 60,
    () => 1,
);

export const admitMember = (tokenHash: string) => memberLimiter.take(`member:${tokenHash}`);

type Gate = "join" | "create";
const GATES: Record<Gate, { capacity: number; perSecond: number }> = {
    // 10 tentativas de entrar por 10 minutos por IP (A1)
    join: { capacity: 10, perSecond: 10 / 600 },
    // 5 salas por hora por IP; o limite de 3 por navegador está no banco (D1)
    create: { capacity: 5, perSecond: 5 / 3600 },
};

/** Tira uma ficha do IP no balde de entrar ou criar. Sem segredo ou sem resposta, recusa. */
export async function admitIp(gate: Gate): Promise<boolean> {
    const config = searchConfig();
    const key = clientKey(getClientIp(await headers()), config.secret, new Date());
    if (!key) return false;
    try {
        const { capacity, perSecond } = GATES[gate];
        return (
            (await takeTokens(createDb(), [[`room:${gate}:${key}`, capacity, perSecond]])) === "ok"
        );
    } catch {
        return false;
    }
}
