// De onde a pessoa veio ao tocar em "Entrar" (US012 C4): vive na aba, nunca na URL (RNE007).

const KEY = "kinne:return-to";
// só caminhos do próprio Kinne: nada de endereço de fora nem de "//": a volta nunca vira redirecionamento aberto
const SAFE = /^\/(?!\/)[a-z0-9\-_/]*$/;

export const isSafeReturn = (value: unknown): value is string =>
    typeof value === "string" && value.length <= 200 && SAFE.test(value);

/** Grava a tela atual para voltar a ela depois de entrar. Chamado no clique de "Entrar". */
export function rememberReturn() {
    try {
        const path = window.location.pathname;
        if (isSafeReturn(path) && !path.startsWith("/entrar")) sessionStorage.setItem(KEY, path);
    } catch {
        // sem armazenamento, volta à tela inicial
    }
}

/** A tela de onde a pessoa veio, ou a inicial. Vale uma vez. */
export function takeReturn(): string {
    try {
        const value = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        return isSafeReturn(value) ? value : "/";
    } catch {
        return "/";
    }
}
