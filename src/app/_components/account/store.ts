import { useEffect, useSyncExternalStore } from "react";
import type { AccountView } from "@/application/accounts";
import { accountState } from "../../_actions/account";

// Quem está na tela, num lugar só (US012 a US015): visitante ou conta aberta. A página não lê a
// sessão no servidor para continuar estática; o navegador pergunta uma vez por carga.

export type AccountStatus =
    { state: "unknown" } | { state: "visitor" } | { state: "account"; account: AccountView };

const UNKNOWN: AccountStatus = { state: "unknown" };
let status: AccountStatus = UNKNOWN;
let loading: Promise<AccountStatus> | null = null;
const listeners = new Set<() => void>();

function set(next: AccountStatus) {
    status = next;
    for (const listener of listeners) listener();
}

export const getAccountStatus = (): AccountStatus => status;

/** Pergunta ao servidor quem está na tela. Falha de rede deixa como visitante, sem erro na tela. */
export function loadAccountStatus(force = false): Promise<AccountStatus> {
    if (force) loading = null;
    loading ??= accountState().then(
        (answer): AccountStatus => {
            const next: AccountStatus = answer.signedIn
                ? { state: "account", account: answer.account }
                : { state: "visitor" };
            set(next);
            return next;
        },
        () => {
            loading = null;
            set({ state: "visitor" });
            return status;
        },
    );
    return loading;
}

/** Troca o que a tela sabe sem perguntar de novo (depois de entrar, sair ou editar a conta). */
export function setAccountStatus(next: AccountStatus) {
    loading = Promise.resolve(next);
    set(next);
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function useAccountStatus(): AccountStatus {
    const current = useSyncExternalStore(subscribe, getAccountStatus, () => UNKNOWN);
    useEffect(() => {
        if (getAccountStatus().state === "unknown") void loadAccountStatus();
    }, []);
    return current;
}
