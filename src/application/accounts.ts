import {
    cleanStreamings,
    deleteAccountEmail,
    LIMITS,
    normalizeEmail,
    normalizeLoginCode,
    signInEmail,
    type OnboardingProgress,
} from "@/domain/accounts";
import type { Streaming } from "@/domain/streaming";
import type { TasteLists } from "@/domain/taste-signals";

// Contas (US012 a US015): os casos de uso, sobre um repositório que a infrastructure implementa.
// A identidade de quem pede é sempre o hash do token da sessão; nenhum id de usuário entra aqui.

export type Message = { subject: string; text: string };

/** O envio do e-mail (Resend, ou o de desenvolvimento fora de produção). */
export interface Mailer {
    send(to: string, message: Message): Promise<void>;
}

export type BrowserData = {
    streamings: readonly Streaming[];
    watched: readonly number[];
    taste: TasteLists;
};

export type SignInStatus = "ok" | "invalid" | "locked";

export type AccountTitle = {
    titleId: number;
    slug: string;
    title: string;
    year: number | null;
    poster: string | null;
    // quando foi marcado (ISO), para a exportação e a ordem
    at: string;
};

/** O que a conta guarda (sem o e-mail, que só sai por kinne_session_email). */
export type StoredAccount = {
    createdAt: string;
    streamings: Streaming[];
    signals: (AccountTitle & { signal: "liked" | "will_watch" | "disliked" })[];
    watched: AccountTitle[];
    onboarding: { step: 1 | 2 | 3; status: "done" | "skipped" }[];
};

/** O que os sorteios leem da conta: só ids e streamings. */
export type StoredTaste = {
    streamings: Streaming[];
    liked: number[];
    willWatch: number[];
    disliked: number[];
    watched: number[];
};

export interface AccountsRepository {
    requestCode(input: { emailHash: string; codeHash: string }): Promise<void>;
    signIn(input: {
        emailHash: string;
        email: string;
        codeHash: string;
        tokenHash: string;
        browser: BrowserData;
    }): Promise<{ status: SignInStatus; isNew: boolean }>;
    sessionUser(tokenHash: string): Promise<number | null>;
    sessionEmail(tokenHash: string): Promise<string | null>;
    signOut(tokenHash: string): Promise<boolean>;
    signOutAll(tokenHash: string): Promise<number>;
    setStreamings(tokenHash: string, streamings: readonly Streaming[]): Promise<boolean>;
    setSignal(
        tokenHash: string,
        titleId: number,
        signal: "liked" | "will_watch" | "disliked" | null,
    ): Promise<boolean>;
    setWatched(tokenHash: string, titleId: number, on: boolean): Promise<boolean>;
    onboardingStep(input: {
        tokenHash: string;
        step: 1 | 2 | 3;
        status: "done" | "skipped";
        titleIds: readonly number[];
        streamings: readonly Streaming[];
    }): Promise<boolean>;
    requestDeleteCode(tokenHash: string, codeHash: string): Promise<boolean>;
    deleteAccount(
        tokenHash: string,
        codeHash: string,
    ): Promise<"ok" | "invalid" | "locked" | "no_session">;
    load(userId: number): Promise<StoredAccount>;
    loadTaste(userId: number): Promise<StoredTaste>;
}

export type Bucket = [key: string, capacity: number, perSecond: number];

export type AccountDeps = {
    repository: AccountsRepository;
    // null quando não há como enviar: nada é enviado nem impresso (C3)
    mailer: Mailer | null;
    // null desliga o login: sem segredo não nasce código (fail closed)
    secret: string | null;
    /** tira fichas do token bucket; false se acabaram ou se o limitador não respondeu */
    take: (buckets: Bucket[]) => Promise<boolean>;
    /** roda depois da resposta, para o tempo não depender do e-mail (C1) */
    defer: (task: () => Promise<void>) => void;
    hashes: {
        email: (email: string, secret: string) => string;
        code: (
            purpose: "sign_in" | "delete_account",
            email: string,
            code: string,
            secret: string,
        ) => string;
        newCode: () => string;
        limiterKey: (email: string, secret: string) => string;
    };
    now: () => Date;
};

export type RequestCodeOutcome =
    { kind: "sent" } | { kind: "invalid-email" } | { kind: "limited" } | { kind: "unavailable" };

const utcDay = (now: Date) => now.toISOString().slice(0, 10);

/**
 * "Receber código" (US012 C1, C2, C6). A resposta é a mesma, no mesmo tempo, exista ou não uma
 * conta com o e-mail (RNE003, C1): o código vai para qualquer e-mail válido, a conta só nasce
 * quando ele é confirmado, e o envio acontece depois da resposta.
 */
export async function requestSignInCode(
    deps: AccountDeps,
    input: { email: unknown; ipKey: string | null },
): Promise<RequestCodeOutcome> {
    const email = normalizeEmail(input.email);
    if (!email) return { kind: "invalid-email" };
    // sem segredo, sem envio ou sem IP conhecido para limitar: nada acontece
    if (!deps.secret || !deps.mailer || !input.ipKey) return { kind: "unavailable" };

    const key = deps.hashes.limiterKey(email, deps.secret);
    const admitted = await deps
        .take([
            [
                `auth:email:cool:${key}`,
                LIMITS.emailCooldown.capacity,
                LIMITS.emailCooldown.perSecond,
            ],
            [`auth:email:hour:${key}`, LIMITS.emailHour.capacity, LIMITS.emailHour.perSecond],
            [`auth:ip:req:${input.ipKey}`, LIMITS.ipRequests.capacity, LIMITS.ipRequests.perSecond],
            [`auth:day:${utcDay(deps.now())}`, LIMITS.dailyEmails, 0],
        ])
        .catch(() => false);
    if (!admitted) return { kind: "limited" };

    const code = deps.hashes.newCode();
    await deps.repository.requestCode({
        emailHash: deps.hashes.email(email, deps.secret),
        codeHash: deps.hashes.code("sign_in", email, code, deps.secret),
    });
    const mailer = deps.mailer;
    // falha no envio não muda a resposta: a pessoa pede de novo (e o limite protege a caixa)
    deps.defer(() => mailer.send(email, signInEmail(code)).catch(() => undefined));
    return { kind: "sent" };
}

export type VerifyOutcome =
    | { kind: "ok"; isNew: boolean }
    | { kind: "invalid" }
    | { kind: "locked" }
    | { kind: "limited" }
    | { kind: "unavailable" };

/**
 * Confirmar o código (US012 C4, C5). O token novo vem de quem chama e nunca de um cookie que o
 * pedido tenha trazido (A3): toda entrada cria uma sessão nova.
 */
export async function verifySignInCode(
    deps: AccountDeps,
    input: {
        email: unknown;
        code: unknown;
        ipKey: string | null;
        tokenHash: string;
        browser: BrowserData;
    },
): Promise<VerifyOutcome> {
    const email = normalizeEmail(input.email);
    const code = normalizeLoginCode(input.code);
    if (!deps.secret || !input.ipKey) return { kind: "unavailable" };
    const admitted = await deps
        .take([
            [
                `auth:ip:verify:${input.ipKey}`,
                LIMITS.ipVerifies.capacity,
                LIMITS.ipVerifies.perSecond,
            ],
        ])
        .catch(() => false);
    if (!admitted) return { kind: "limited" };
    // formato errado vale como código errado, sem dizer qual parte falhou
    if (!email || !code) return { kind: "invalid" };

    const result = await deps.repository.signIn({
        emailHash: deps.hashes.email(email, deps.secret),
        email,
        codeHash: deps.hashes.code("sign_in", email, code, deps.secret),
        tokenHash: input.tokenHash,
        browser: {
            streamings: cleanStreamings(input.browser.streamings),
            watched: input.browser.watched,
            taste: input.browser.taste,
        },
    });
    return result.status === "ok" ? { kind: "ok", isNew: result.isNew } : { kind: result.status };
}

export type DeleteCodeOutcome =
    { kind: "sent" } | { kind: "no-session" } | { kind: "limited" } | { kind: "unavailable" };

/** O código novo que apagar a conta pede (US014 C5, RNE001): só para quem tem sessão. */
export async function requestDeleteCode(
    deps: AccountDeps,
    input: { tokenHash: string; ipKey: string | null },
): Promise<DeleteCodeOutcome> {
    if (!deps.secret || !deps.mailer || !input.ipKey) return { kind: "unavailable" };
    const email = await deps.repository.sessionEmail(input.tokenHash);
    if (!email) return { kind: "no-session" };
    const key = deps.hashes.limiterKey(email, deps.secret);
    const admitted = await deps
        .take([
            [
                `auth:email:cool:${key}`,
                LIMITS.emailCooldown.capacity,
                LIMITS.emailCooldown.perSecond,
            ],
            [`auth:email:hour:${key}`, LIMITS.emailHour.capacity, LIMITS.emailHour.perSecond],
            [`auth:ip:req:${input.ipKey}`, LIMITS.ipRequests.capacity, LIMITS.ipRequests.perSecond],
            [`auth:day:${utcDay(deps.now())}`, LIMITS.dailyEmails, 0],
        ])
        .catch(() => false);
    if (!admitted) return { kind: "limited" };
    const code = deps.hashes.newCode();
    const stored = await deps.repository.requestDeleteCode(
        input.tokenHash,
        deps.hashes.code("delete_account", email, code, deps.secret),
    );
    if (!stored) return { kind: "no-session" };
    const mailer = deps.mailer;
    deps.defer(() => mailer.send(email, deleteAccountEmail(code)).catch(() => undefined));
    return { kind: "sent" };
}

export type DeleteOutcome =
    | { kind: "deleted" }
    | { kind: "invalid" }
    | { kind: "locked" }
    | { kind: "limited" }
    | { kind: "no-session" }
    | { kind: "unavailable" };

/** Apagar a conta (US014 C5): sessão válida e o código novo, ou nada acontece (B4). */
export async function deleteAccountWithCode(
    deps: AccountDeps,
    input: { tokenHash: string; code: unknown; ipKey: string | null },
): Promise<DeleteOutcome> {
    if (!deps.secret || !input.ipKey) return { kind: "unavailable" };
    const admitted = await deps
        .take([
            [
                `auth:ip:verify:${input.ipKey}`,
                LIMITS.ipVerifies.capacity,
                LIMITS.ipVerifies.perSecond,
            ],
        ])
        .catch(() => false);
    if (!admitted) return { kind: "limited" };
    const email = await deps.repository.sessionEmail(input.tokenHash);
    if (!email) return { kind: "no-session" };
    const code = normalizeLoginCode(input.code);
    if (!code) return { kind: "invalid" };
    const result = await deps.repository.deleteAccount(
        input.tokenHash,
        deps.hashes.code("delete_account", email, code, deps.secret),
    );
    if (result === "ok") return { kind: "deleted" };
    return result === "no_session" ? { kind: "no-session" } : { kind: result };
}

// ---------------------------------------------------------------------------------------------
// O que a tela e os sorteios leem da conta

export type AccountView = {
    email: string;
    createdAt: string;
    streamings: Streaming[];
    liked: AccountTitle[];
    willWatch: AccountTitle[];
    disliked: AccountTitle[];
    watched: AccountTitle[];
    onboarding: OnboardingProgress;
};

const byTime = (a: AccountTitle, b: AccountTitle) => a.at.localeCompare(b.at);

export function toAccountView(email: string, stored: StoredAccount): AccountView {
    const of = (signal: StoredAccount["signals"][number]["signal"]) =>
        stored.signals.filter((s) => s.signal === signal).sort(byTime);
    return {
        email,
        createdAt: stored.createdAt,
        streamings: stored.streamings,
        liked: of("liked"),
        willWatch: of("will_watch"),
        disliked: of("disliked"),
        watched: [...stored.watched].sort(byTime),
        onboarding: Object.fromEntries(stored.onboarding.map((o) => [o.step, o.status])),
    };
}

/** Os sinais como o grafo os lê: ids do mais antigo ao mais recente (US009). */
export function tasteOf(view: Pick<AccountView, "liked" | "willWatch" | "disliked">): TasteLists {
    const ids = (list: AccountTitle[]) => list.map((t) => t.titleId);
    return { liked: ids(view.liked), willWatch: ids(view.willWatch), disliked: ids(view.disliked) };
}

/** O arquivo de "Baixar meus dados" (US014 C4): só o que é da conta, sem hashes nem sessões (C4). */
export function exportOf(view: AccountView) {
    const title = (t: AccountTitle) => ({
        titleId: t.titleId,
        slug: t.slug,
        title: t.title,
        at: t.at,
    });
    return {
        email: view.email,
        createdAt: view.createdAt,
        streamings: view.streamings,
        taste: {
            liked: view.liked.map(title),
            willWatch: view.willWatch.map(title),
            disliked: view.disliked.map(title),
        },
        watched: view.watched.map(title),
        onboarding: view.onboarding,
    };
}
