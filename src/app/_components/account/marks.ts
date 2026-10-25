import { clearAccountTraces, tasteSignals, watchedTitles } from "@/infrastructure/browser-storage";
import type { AccountView } from "@/application/accounts";
import { setSignal, setWatched, signOut } from "../../_actions/account";
import { getAccountStatus, loadAccountStatus, setAccountStatus } from "./store";

// Onde o gosto e o "Já vi" são gravados (US015 C2): com a conta aberta, na conta; sem ela, no
// navegador. A tela chama estas funções e não se preocupa com qual dos dois vale.

type Marked = { id: number; slug: string };
type Signal = "liked" | "will_watch" | "disliked";

async function currentAccount(): Promise<AccountView | null> {
    const status =
        getAccountStatus().state === "unknown" ? await loadAccountStatus() : getAccountStatus();
    return status.state === "account" ? status.account : null;
}

/** Atualiza a cópia da conta que a tela guarda, sem pedir tudo de novo ao servidor. */
function withSignal(account: AccountView, title: Marked, signal: Signal): AccountView {
    const entry = {
        titleId: title.id,
        slug: title.slug,
        title: "",
        year: null,
        poster: null,
        at: new Date().toISOString(),
    };
    const without = (list: AccountView["liked"]) => list.filter((t) => t.titleId !== title.id);
    return {
        ...account,
        liked: signal === "liked" ? [...without(account.liked), entry] : without(account.liked),
        willWatch:
            signal === "will_watch"
                ? [...without(account.willWatch), entry]
                : without(account.willWatch),
        disliked:
            signal === "disliked"
                ? [...without(account.disliked), entry]
                : without(account.disliked),
    };
}

/** Curti, não curti ou vou assistir. Devolve false se a conta recusou (a tela não precisa de erro). */
export async function markSignal(title: Marked, signal: Signal): Promise<boolean> {
    const account = await currentAccount();
    if (!account) {
        tasteSignals.record(title.id, signal);
        return true;
    }
    const answer = await setSignal({ slug: title.slug, signal }).catch(() => ({ ok: false }));
    if (answer.ok)
        setAccountStatus({ state: "account", account: withSignal(account, title, signal) });
    return answer.ok;
}

export async function markWatched(title: Marked): Promise<boolean> {
    const account = await currentAccount();
    if (!account) {
        watchedTitles.add(title.id);
        return true;
    }
    const answer = await setWatched({ slug: title.slug, on: true }).catch(() => ({ ok: false }));
    if (answer.ok && !account.watched.some((t) => t.titleId === title.id)) {
        const entry = {
            titleId: title.id,
            slug: title.slug,
            title: "",
            year: null,
            poster: null,
            at: new Date().toISOString(),
        };
        setAccountStatus({
            state: "account",
            account: { ...account, watched: [...account.watched, entry] },
        });
    }
    return answer.ok;
}

/**
 * Sair (US012 C7, US015 RNE004): o servidor encerra a sessão, e só se ele confirmar o navegador
 * apaga o gosto, o "Já vi", os streamings e o que a conta deixou na aba (M5, B1). Devolve false se o
 * servidor recusou ou não respondeu: a pessoa continua com a conta aberta e pode tentar de novo.
 */
export async function leaveAccount(
    everywhere: () => Promise<{ ok: boolean }> = signOut,
): Promise<boolean> {
    const answer = await everywhere().catch(() => ({ ok: false }));
    if (!answer.ok) return false;
    clearAccountTraces();
    setAccountStatus({ state: "visitor" });
    return true;
}

/** Depois de a conta ser apagada no servidor: o navegador volta a ser de um visitante do zero. */
export function afterAccountDeleted() {
    clearAccountTraces();
    setAccountStatus({ state: "visitor" });
}
