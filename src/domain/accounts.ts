import { isStreaming, type Streaming } from "./streaming";
import { normalizeTaste, TASTE_LIST_MAX, type TasteLists } from "./taste-signals";

// Contas do Kinne (US012 a US015, docs/threats/accounts.md): as regras puras. O banco repete as
// que precisam ser atômicas (funções kinne_* da migration 0011); este arquivo é a especificação
// testável delas.

// ---------------------------------------------------------------------------------------------
// E-mail e código (US012 RNE001, RNE002)

export const MAX_EMAIL_LENGTH = 254;
export const CODE_DIGITS = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
// 5 erros e o código deixa de valer (RNE004, A1)
export const MAX_CODE_ATTEMPTS = 5;

// Um subconjunto estrito de dot-atom (RFC 5322) em minúsculas e ASCII: sem vírgula, ponto e vírgula,
// <>, aspas, espaço nem ponto duplo, e o último rótulo do domínio começa por letra. É o mesmo
// critério do CHECK users_email_check (revisão B4): o que chega ao Resend é sempre um endereço só.
const ATOM = "[a-z0-9!#$%&*+/=?^_{|}~-]+";
const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const TLD = "[a-z](?:[a-z0-9-]{0,61}[a-z0-9])";
export const EMAIL_PATTERN = `^${ATOM}(?:\\.${ATOM})*@(?:${LABEL}\\.)+${TLD}$`;
const EMAIL = new RegExp(EMAIL_PATTERN);
export const MAX_EMAIL_LOCAL_LENGTH = 64;

/** Minúsculas, sem espaços nas pontas, um endereço dot-atom só e até 254 caracteres; senão, null. */
export function normalizeEmail(input: unknown): string | null {
    if (typeof input !== "string" || input.length > MAX_EMAIL_LENGTH + 64) return null;
    const email = input.trim().toLowerCase();
    if (email.length < 3 || email.length > MAX_EMAIL_LENGTH) return null;
    if (email.indexOf("@") > MAX_EMAIL_LOCAL_LENGTH) return null;
    return EMAIL.test(email) ? email : null;
}

/** O código como a pessoa digita: 6 dígitos, com ou sem espaço ou hífen no meio. */
export function normalizeLoginCode(input: unknown): string | null {
    if (typeof input !== "string" || input.length > 16) return null;
    const code = input.replace(/[\s-]/g, "");
    return /^\d{6}$/.test(code) ? code : null;
}

/** Um inteiro de 0 a 999999 (do gerador criptográfico) vira o código de 6 dígitos. */
export function codeFromNumber(n: number): string {
    if (!Number.isInteger(n) || n < 0 || n >= 10 ** CODE_DIGITS)
        throw new RangeError("Código fora da faixa");
    return String(n).padStart(CODE_DIGITS, "0");
}

/** O texto do e-mail (RNE006): o código e nada além disso, sem link. */
export function signInEmail(code: string): { subject: string; text: string } {
    return {
        subject: "Seu código do Kinne",
        text: `Seu código do Kinne: ${code.slice(0, 3)} ${code.slice(3)}. Vale por 10 minutos. Se não foi você, ignore este e-mail.`,
    };
}

/** O texto do código para apagar a conta (US014 C5). */
export function deleteAccountEmail(code: string): { subject: string; text: string } {
    return {
        subject: "Código para apagar sua conta do Kinne",
        text: `Código para apagar sua conta do Kinne: ${code.slice(0, 3)} ${code.slice(3)}. Vale por 10 minutos. Se não foi você, ignore este e-mail e a sua conta continua como está.`,
    };
}

// ---------------------------------------------------------------------------------------------
// Limites de pedido (RNE004, D1)

export const LIMITS = {
    // por e-mail: 1 a cada 60 s e 5 por hora
    emailCooldown: { capacity: 1, perSecond: 1 / 60 },
    emailHour: { capacity: 5, perSecond: 5 / 3600 },
    // por IP: pedidos de código e tentativas de confirmar
    ipRequests: { capacity: 10, perSecond: 10 / 600 },
    ipVerifies: { capacity: 20, perSecond: 20 / 600 },
    // todos juntos, por dia (UTC), abaixo dos 100 do plano gratuito do Resend
    dailyEmails: 80,
} as const;

// ---------------------------------------------------------------------------------------------
// Sessão (US012 RNE005)

export const SESSION_SLIDING_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1000;
// a sessão renova no máximo uma vez por hora: ler não escreve a cada ação
export const SESSION_RENEW_AFTER_MS = 60 * 60 * 1000;
export const MAX_SESSIONS = 10;

export const SESSION_COOKIE = "__Host-kinne_session";
// o desafio do código (M1): o navegador que pediu o código é o único que o confirma
export const CHALLENGE_COOKIE = "__Host-kinne_challenge";

/** Até quando a sessão vale, ao usar agora: 30 dias, sem passar de 90 desde o login. */
export function sessionExpiry(createdAt: Date, now: Date): Date {
    return new Date(
        Math.min(now.getTime() + SESSION_SLIDING_MS, createdAt.getTime() + SESSION_ABSOLUTE_MS),
    );
}

export function sessionAlive(session: { expiresAt: Date; createdAt: Date }, now: Date): boolean {
    return (
        session.expiresAt.getTime() > now.getTime() &&
        session.createdAt.getTime() + SESSION_ABSOLUTE_MS > now.getTime()
    );
}

// ---------------------------------------------------------------------------------------------
// O que a conta guarda e como o navegador se junta a ela (US015)

export const MAX_WATCHED = 2000;

/** Tudo o que a conta guarda do gosto, do mais antigo ao mais recente. */
export type AccountTaste = {
    streamings: Streaming[];
    signals: TasteLists;
    watched: number[];
};

const keepNewest = <T>(items: readonly T[], max: number) => items.slice(-max);
const unique = <T>(items: readonly T[]) => [...new Set(items)];

/**
 * Junta o que o navegador tinha à conta quando a pessoa entra (US015 RNE002): no conflito do
 * mesmo título, o navegador vence (foi mexido nesta sessão, antes do login); "Já vi" é a união;
 * streamings ficam os da conta, ou os do navegador se a conta não tem nenhum. Cada lista guarda os
 * mais recentes (200 sinais, 2000 "Já vi").
 */
export function mergeBrowserIntoAccount(
    account: AccountTaste,
    browser: AccountTaste,
): AccountTaste {
    const inBrowser = new Set([
        ...browser.signals.liked,
        ...browser.signals.willWatch,
        ...browser.signals.disliked,
    ]);
    const kept = (list: readonly number[]) => list.filter((id) => !inBrowser.has(id));
    const signals = normalizeTaste({
        liked: keepNewest(
            [...kept(account.signals.liked), ...browser.signals.liked],
            TASTE_LIST_MAX,
        ),
        willWatch: keepNewest(
            [...kept(account.signals.willWatch), ...browser.signals.willWatch],
            TASTE_LIST_MAX,
        ),
        disliked: keepNewest(
            [...kept(account.signals.disliked), ...browser.signals.disliked],
            TASTE_LIST_MAX,
        ),
    });
    return {
        streamings: account.streamings.length > 0 ? account.streamings : browser.streamings,
        signals,
        watched: keepNewest(unique([...account.watched, ...browser.watched]), MAX_WATCHED),
    };
}

/** Streamings vindos de fora (navegador, corpo de um pedido): só os cinco ids, sem repetir. */
export function cleanStreamings(value: unknown): Streaming[] {
    if (!Array.isArray(value)) return [];
    return unique(value.filter((v): v is Streaming => typeof v === "string" && isStreaming(v)));
}

// ---------------------------------------------------------------------------------------------
// Onboarding (US013)

export const ONBOARDING_STEPS = [
    { step: 1, title: "3 títulos que você amou", count: 3, signal: "liked" },
    { step: 2, title: "3 títulos que você detestou", count: 3, signal: "disliked" },
    { step: 3, title: "Onde você assiste", count: null, signal: null },
] as const;

export type OnboardingStatus = "done" | "skipped";
export type OnboardingProgress = Partial<Record<1 | 2 | 3, OnboardingStatus>>;

/** O primeiro passo ainda sem resposta (C5): passo pulado já foi respondido. Null se acabou. */
export function nextOnboardingStep(progress: OnboardingProgress): 1 | 2 | 3 | null {
    return ([1, 2, 3] as const).find((s) => progress[s] === undefined) ?? null;
}

/** Porcentagem da barra (C1): cada passo respondido vale um terço. */
export function onboardingPercent(progress: OnboardingProgress): number {
    return Math.round(
        ([1, 2, 3] as const).filter((s) => progress[s] !== undefined).length * (100 / 3),
    );
}

/** Há passo pulado: o perfil mostra "Complete seu gosto" (C4). */
export const hasSkippedStep = (progress: OnboardingProgress) =>
    ([1, 2, 3] as const).some((s) => progress[s] === "skipped");

/**
 * O que um passo já traz do navegador (C3): os "curti" mais recentes no passo 1, os "não curti" no 2
 * (até 3), os streamings no 3. Títulos já escolhidos no outro passo não repetem (C2).
 */
export function onboardingPrefill(
    step: 1 | 2 | 3,
    browser: { signals: TasteLists; streamings: readonly Streaming[] },
): { titleIds: number[]; streamings: Streaming[] } {
    if (step === 3) return { titleIds: [], streamings: [...browser.streamings] };
    const list = step === 1 ? browser.signals.liked : browser.signals.disliked;
    return { titleIds: list.slice(-3), streamings: [] };
}
