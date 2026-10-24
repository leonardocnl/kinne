import "server-only";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import {
    toAccountView,
    type AccountDeps,
    type AccountView,
    type BrowserData,
} from "@/application/accounts";
import { SESSION_COOKIE, SESSION_ABSOLUTE_MS } from "@/domain/accounts";
import { isSlug } from "@/domain/catalog";
import { isStreaming, STREAMING_SERVICES, type Streaming } from "@/domain/streaming";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { normalizeTaste, type TasteLists } from "@/domain/taste-signals";
import { clientKey, getClientIp } from "@/infrastructure/client-ip";
import {
    codeHash,
    emailHash,
    isSessionToken,
    limiterKey,
    newLoginCode,
    sessionTokenHash as hashSessionToken,
} from "@/infrastructure/auth/crypto";
import { authConfig } from "@/infrastructure/auth/config";
import { selectMailer } from "@/infrastructure/auth/mailer";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleAccountsRepository } from "@/infrastructure/db/accounts-repository";
import { takeTokens } from "@/infrastructure/db/rate-limiter";
import { MemoryLimiter } from "@/infrastructure/memory-limiter";
import { idListSchema } from "./surprise";
import { tasteSchema } from "./taste";

export const accountRepository = () => new DrizzleAccountsRepository(createDb());

// ---------------------------------------------------------------------------------------------
// Entrada estrita (B1): listas fechadas, tamanhos limitados, chaves desconhecidas recusadas.

const unique = (list: readonly string[]) => new Set(list).size === list.length;

export const streamingsSchema = z
    .array(z.custom<Streaming>((v) => typeof v === "string" && isStreaming(v)))
    .max(STREAMING_SERVICES.length)
    .refine(unique);

const slugSchema = z.string().max(120).refine(isSlug);

export const requestCodeSchema = z.strictObject({ email: z.string().max(400) });

export const verifyCodeSchema = z.strictObject({
    email: z.string().max(400),
    code: z.string().max(16),
    // o que o navegador tinha, para juntar à conta (US015 C1)
    browser: z.strictObject({
        streamings: streamingsSchema,
        watched: idListSchema,
        taste: tasteSchema,
    }),
});

export const streamingsRequestSchema = z.strictObject({ streamings: streamingsSchema });

export const signalRequestSchema = z.strictObject({
    slug: slugSchema,
    signal: z.enum(["liked", "will_watch", "disliked"]).nullable(),
});

export const watchedRequestSchema = z.strictObject({ slug: slugSchema, on: z.boolean() });

export const onboardingSchema = z.strictObject({
    step: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    status: z.enum(["done", "skipped"]),
    // no máximo 3 por passo (B1); o servidor deriva os ids dos slugs
    slugs: z.array(slugSchema).max(3).refine(unique),
    streamings: streamingsSchema,
});

export const deleteSchema = z.strictObject({ code: z.string().max(16) });

export function parseWith<T>(schema: z.ZodType<T, unknown>, input: unknown): T | null {
    const parsed = schema.safeParse(input);
    return parsed.success ? parsed.data : null;
}

export const MAX_WATCHED_SENT = SURPRISE_MAX_EXCLUDED;

// ---------------------------------------------------------------------------------------------
// Quem pede: o cookie de sessão é a única identidade (A2, A4).

// O site não guarda id de usuário: o banco acha a conta pelo hash do token em cada chamada.
export type Session = { tokenHash: string };

/** O hash do cookie de sessão, ou null se falta ou não tem o formato. Não confere o banco. */
export async function sessionTokenHash(): Promise<string | null> {
    const value = (await cookies()).get(SESSION_COOKIE)?.value;
    return isSessionToken(value) ? hashSessionToken(value) : null;
}

/** A sessão viva e a conta dela, achadas pelo banco (renova a sessão). Null para visitante. */
export async function currentSession(): Promise<Session | null> {
    const tokenHash = await sessionTokenHash();
    if (!tokenHash) return null;
    try {
        const alive = await accountRepository().sessionUser(tokenHash);
        return alive === null ? null : { tokenHash };
    } catch {
        // sem resposta do banco, vale como visitante: o sorteio segue com o que o pedido trouxe
        return null;
    }
}

/** O que os sorteios usam no lugar do que o navegador manda, quando há conta (US015 RNE003). */
export type DrawAccount = { streamings: Streaming[]; watched: number[]; taste: TasteLists };

/**
 * O gosto, o "Já vi" e os streamings da conta da sessão, lidos no servidor. Com sessão viva, o
 * pedido de sorteio não manda listas, e as que mandar são ignoradas (A4, B2). Null para visitante.
 */
export async function drawAccount(): Promise<DrawAccount | null> {
    const session = await currentSession();
    if (!session) return null;
    try {
        const stored = await accountRepository().loadTaste(session.tokenHash);
        if (!stored) return null;
        return {
            streamings: stored.streamings,
            watched: stored.watched,
            taste: normalizeTaste({
                liked: stored.liked,
                willWatch: stored.willWatch,
                disliked: stored.disliked,
            }),
        };
    } catch {
        // a conta existe mas não respondeu: o sorteio não cai para as listas do pedido
        return { streamings: [], watched: [], taste: { liked: [], willWatch: [], disliked: [] } };
    }
}

/** A conta inteira da sessão, para a tela e para os sorteios. */
export async function loadAccountView(session: Session): Promise<AccountView | null> {
    const repository = accountRepository();
    const [email, stored] = await Promise.all([
        repository.sessionEmail(session.tokenHash),
        repository.load(session.tokenHash),
    ]);
    return email && stored ? toAccountView(email, stored) : null;
}

const secureCookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/** O cookie da sessão: `__Host-`, HttpOnly, Secure, Lax, Path=/, até o teto de 90 dias (RNE005). */
export async function setSessionCookie(token: string) {
    (await cookies()).set(SESSION_COOKIE, token, {
        ...secureCookie,
        expires: new Date(Date.now() + SESSION_ABSOLUTE_MS),
    });
}

export async function clearSessionCookie() {
    (await cookies()).set(SESSION_COOKIE, "", { ...secureCookie, maxAge: 0 });
}

// ---------------------------------------------------------------------------------------------
// Limites e dependências dos casos de uso

// Ações de quem já entrou, por sessão e por instância (perfil, onboarding, marcações).
const memberLimiter = new MemoryLimiter(
    () => 120,
    () => 2,
);
export const admitSession = (tokenHash: string) => memberLimiter.take(`account:${tokenHash}`);

export async function accountDeps(): Promise<{ deps: AccountDeps; ipKey: string | null }> {
    const config = authConfig();
    const ipKey = clientKey(getClientIp(await headers()), config.secret ?? undefined, new Date());
    const deps: AccountDeps = {
        repository: accountRepository(),
        mailer: selectMailer(config),
        secret: config.secret,
        take: async (buckets) => (await takeTokens(createDb(), buckets)) === "ok",
        // depois da resposta: o tempo não depende de o e-mail ter sido enviado (C1)
        defer: (task) => after(task),
        hashes: { email: emailHash, code: codeHash, newCode: newLoginCode, limiterKey },
        now: () => new Date(),
    };
    return { deps, ipKey };
}

export type { BrowserData };
