"use server";

import "server-only";
import {
    deleteAccountWithCode,
    exportOf,
    requestDeleteCode as requestDeleteCodeCase,
    requestSignInCode,
    verifySignInCode,
    type AccountView,
} from "@/application/accounts";
import { newSessionToken, sessionTokenHash } from "@/infrastructure/auth/crypto";
import {
    accountDeps,
    accountRepository,
    admitSession,
    challengeHash as cookieChallengeHash,
    clearChallengeCookie,
    clearSessionCookie,
    currentSession,
    deleteSchema,
    loadAccountView,
    onboardingSchema,
    parseWith,
    requestCodeSchema,
    sessionTokenHash as cookieTokenHash,
    setChallengeCookie,
    setSessionCookie,
    type Session,
    signalRequestSchema,
    streamingsRequestSchema,
    verifyCodeSchema,
    watchedRequestSchema,
} from "../_data/account";

// Contas (US012 a US015). Cada ação é um ponto de entrada público: entrada estrita, a sessão do
// cookie como única identidade (nenhuma ação aceita id de usuário), resposta curta e genérica.
// Nada aqui escreve em log: e-mail, código e token nunca saem do servidor (C2).

export type Done = { ok: true } | { ok: false };
const OK = { ok: true } as const;
const REFUSED = { ok: false } as const;

// ---------------------------------------------------------------------------------------------
// Entrar e sair (US012)

export type RequestCodeAnswer = "sent" | "invalid-email" | "limited" | "unavailable";

/** "Receber código" (C1, C2, C6): a mesma resposta, exista ou não conta com este e-mail. */
export async function requestCode(input: unknown): Promise<RequestCodeAnswer> {
    const request = parseWith(requestCodeSchema, input);
    if (!request) return "invalid-email";
    try {
        const { deps, ipKey } = await accountDeps();
        // o desafio nasce aqui e só o navegador que pediu o código o tem (M1)
        const challenge = newSessionToken();
        const outcome = await requestSignInCode(deps, {
            email: request.email,
            ipKey,
            challengeHash: sessionTokenHash(challenge),
        });
        if (outcome.kind === "sent") await setChallengeCookie(challenge);
        return outcome.kind;
    } catch {
        return "unavailable";
    }
}

export type VerifyAnswer =
    { kind: "ok"; isNew: boolean } | { kind: "invalid" | "locked" | "limited" | "unavailable" };

/**
 * Confirmar o código (C4, C5). Abre uma sessão NOVA com um token sorteado agora: qualquer cookie
 * que o pedido traga é ignorado (A3).
 */
export async function verifyCode(input: unknown): Promise<VerifyAnswer> {
    const request = parseWith(verifyCodeSchema, input);
    if (!request) return { kind: "invalid" };
    try {
        const { deps, ipKey } = await accountDeps();
        const token = newSessionToken();
        const outcome = await verifySignInCode(deps, {
            email: request.email,
            code: request.code,
            ipKey,
            challengeHash: await cookieChallengeHash(),
            tokenHash: sessionTokenHash(token),
            browser: request.browser,
        });
        if (outcome.kind !== "ok") return { kind: outcome.kind };
        await setSessionCookie(token);
        await clearChallengeCookie();
        return { kind: "ok", isNew: outcome.isNew };
    } catch {
        return { kind: "unavailable" };
    }
}

/** "Sair" (C7): encerra a sessão no servidor e apaga o cookie. O navegador se limpa na tela. */
export async function signOut(): Promise<Done> {
    const tokenHash = await cookieTokenHash();
    await clearSessionCookie();
    if (!tokenHash) return OK;
    try {
        await accountRepository().signOut(tokenHash);
    } catch {
        return REFUSED;
    }
    return OK;
}

/** "Sair de todos os aparelhos" (US014 C3): todas as sessões da conta, esta inclusive. */
export async function signOutAll(): Promise<Done> {
    const session = await currentSession();
    await clearSessionCookie();
    if (!session) return OK;
    try {
        await accountRepository().signOutAll(session.tokenHash);
    } catch {
        return REFUSED;
    }
    return OK;
}

// ---------------------------------------------------------------------------------------------
// A conta que a tela mostra

export type AccountState = { signedIn: false } | { signedIn: true; account: AccountView };

/** Quem está na tela: visitante, ou a conta com tudo o que ela guarda (perfil, onboarding, filtros). */
export async function accountState(): Promise<AccountState> {
    const session = await currentSession();
    if (!session) return { signedIn: false };
    try {
        const account = await loadAccountView(session);
        return account ? { signedIn: true, account } : { signedIn: false };
    } catch {
        return { signedIn: false };
    }
}

// ---------------------------------------------------------------------------------------------
// Mudar o que o Kinne sabe (US014 C2, US015 C2)

async function acting(): Promise<Session | null> {
    const session = await currentSession();
    return session && admitSession(session.tokenHash) ? session : null;
}

/** Os streamings da conta (US014 C2, US013 passo 3). */
export async function saveStreamings(input: unknown): Promise<Done> {
    const request = parseWith(streamingsRequestSchema, input);
    const session = await acting();
    if (!request || !session) return REFUSED;
    try {
        return (await accountRepository().setStreamings(session.tokenHash, request.streamings))
            ? OK
            : REFUSED;
    } catch {
        return REFUSED;
    }
}

/** Curti, vou assistir, não curti, ou tirar o título da lista (nulo). O servidor deriva o id do slug. */
export async function setSignal(input: unknown): Promise<Done> {
    const request = parseWith(signalRequestSchema, input);
    const session = await acting();
    if (!request || !session) return REFUSED;
    try {
        const repository = accountRepository();
        const id = (await repository.titleIds([request.slug])).get(request.slug);
        if (id === undefined) return REFUSED;
        return (await repository.setSignal(session.tokenHash, id, request.signal)) ? OK : REFUSED;
    } catch {
        return REFUSED;
    }
}

/** "Já vi": marca ou tira da lista. */
export async function setWatched(input: unknown): Promise<Done> {
    const request = parseWith(watchedRequestSchema, input);
    const session = await acting();
    if (!request || !session) return REFUSED;
    try {
        const repository = accountRepository();
        const id = (await repository.titleIds([request.slug])).get(request.slug);
        if (id === undefined) return REFUSED;
        return (await repository.setWatched(session.tokenHash, id, request.on)) ? OK : REFUSED;
    } catch {
        return REFUSED;
    }
}

// ---------------------------------------------------------------------------------------------
// Onboarding (US013)

/** Concluir ou pular um passo; concluir grava os sinais ou os streamings na hora (RNE002). */
export async function saveOnboardingStep(input: unknown): Promise<Done> {
    const request = parseWith(onboardingSchema, input);
    const session = await acting();
    if (!request || !session) return REFUSED;
    try {
        const repository = accountRepository();
        const ids = await repository.titleIds(request.slugs);
        // um slug que não existe no catálogo derruba o passo inteiro, sem gravar nada
        if (ids.size !== request.slugs.length) return REFUSED;
        const done = await repository.onboardingStep({
            tokenHash: session.tokenHash,
            step: request.step,
            status: request.status,
            titleIds: request.slugs.map((slug) => ids.get(slug)!),
            streamings: request.streamings,
        });
        return done ? OK : REFUSED;
    } catch {
        return REFUSED;
    }
}

// ---------------------------------------------------------------------------------------------
// Meus dados (US014 C4, C5)

/** "Baixar meus dados": só o que é da conta da sessão, sem sessões nem hashes (C4). */
export async function exportMyData() {
    const session = await acting();
    if (!session) return null;
    try {
        const account = await loadAccountView(session);
        return account ? exportOf(account) : null;
    } catch {
        return null;
    }
}

export type DeleteCodeAnswer = "sent" | "no-session" | "limited" | "unavailable";

/** O código novo que confirma apagar a conta: só quem tem sessão pede (B4). */
export async function requestDeleteCode(): Promise<DeleteCodeAnswer> {
    const tokenHash = await cookieTokenHash();
    if (!tokenHash) return "no-session";
    try {
        const { deps, ipKey } = await accountDeps();
        return (await requestDeleteCodeCase(deps, { tokenHash, ipKey })).kind;
    } catch {
        return "unavailable";
    }
}

export type DeleteAnswer =
    "deleted" | "invalid" | "locked" | "limited" | "no-session" | "unavailable";

/** "Apagar minha conta": sessão válida e o código novo, ou nada acontece. */
export async function deleteAccount(input: unknown): Promise<DeleteAnswer> {
    const request = parseWith(deleteSchema, input);
    const tokenHash = await cookieTokenHash();
    if (!request) return "invalid";
    if (!tokenHash) return "no-session";
    try {
        const { deps, ipKey } = await accountDeps();
        const outcome = await deleteAccountWithCode(deps, { tokenHash, code: request.code, ipKey });
        if (outcome.kind === "deleted") await clearSessionCookie();
        return outcome.kind;
    } catch {
        return "unavailable";
    }
}
