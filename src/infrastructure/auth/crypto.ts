import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { codeFromNumber, normalizeEmail } from "@/domain/accounts";

// Só o crypto do Node (decisão de 23/10/2026). O segredo é o AUTH_SECRET.

export type CodePurpose = "sign_in" | "delete_account";

/** O e-mail de um código pendente, só como HMAC: o banco não guarda o endereço (A5, C6). */
export function emailHash(email: string, secret: string): string {
    const normal = normalizeEmail(email);
    if (!normal) throw new RangeError("E-mail inválido");
    return createHmac("sha256", secret).update(`email|${normal}`).digest("hex");
}

/**
 * O código, só como HMAC que leva a finalidade e o e-mail na entrada: um código gerado para uma
 * finalidade ou e-mail não vale em outro contexto (A5).
 */
export function codeHash(
    purpose: CodePurpose,
    email: string,
    code: string,
    secret: string,
): string {
    const normal = normalizeEmail(email);
    if (!normal) throw new RangeError("E-mail inválido");
    return createHmac("sha256", secret).update(`code|${purpose}|${normal}|${code}`).digest("hex");
}

/** Seis dígitos de um gerador criptográfico, sem viés. */
export const newLoginCode = (): string => codeFromNumber(randomInt(0, 1_000_000));

/** O token do cookie de sessão: 32 bytes aleatórios (A2). */
export const newSessionToken = (): string => randomBytes(32).toString("base64url");

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
export const isSessionToken = (value: unknown): value is string =>
    typeof value === "string" && TOKEN.test(value);

/** No banco entra só o SHA-256 do token; o cookie nunca. */
export const sessionTokenHash = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

/** Hash do e-mail para as chaves do limite de pedidos (não guarda o endereço). */
export const limiterKey = (email: string, secret: string): string =>
    createHmac("sha256", secret).update(`limit|${email}`).digest("hex").slice(0, 32);

export const sameHash = (a: string, b: string): boolean =>
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
