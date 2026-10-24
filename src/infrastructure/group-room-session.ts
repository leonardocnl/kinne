import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";

// O cookie de membro da sala (group-room A2): 32 bytes aleatórios, guardados no banco só como
// SHA-256. A sala é reconhecida pelo cookie daí em diante, nunca por um id vindo do corpo.

export const ROOM_COOKIE = "kinne_room";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export const newMemberToken = (): string => randomBytes(32).toString("base64url");

export const isMemberToken = (value: unknown): value is string =>
    typeof value === "string" && TOKEN.test(value);

export const hashToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

/** HttpOnly, Secure, SameSite=Lax, só sob /sala; vale até a sala expirar. */
export function cookieOptions(expires: Date) {
    return {
        httpOnly: true,
        secure: true,
        sameSite: "lax" as const,
        path: "/sala",
        expires,
    };
}

/**
 * Quem criou a sala, para o limite de 3 por hora: o HMAC do código do navegador. O código é
 * escolhido pelo cliente, então o limite por IP (token bucket) vem junto; sem o segredo, nada
 * se cria (falha fechada).
 */
export function creatorKey(browserId: string, secret: string | undefined): string | null {
    if (!secret) return null;
    return createHmac("sha256", secret).update(`room-creator:${browserId}`).digest("hex");
}
