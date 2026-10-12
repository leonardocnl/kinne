import "server-only";
const POSTGRES_URL = /^postgres(ql)?:\/\/[^"'\s]+$/;
export const SYNC_TARGETS = ["develop", "production"] as const;
export type SyncTarget = (typeof SYNC_TARGETS)[number];

// Confere as variáveis da carga antes de qualquer requisição. Nunca inclui o valor na mensagem.
export function syncEnvErrors(env: Record<string, string | undefined>): string[] {
    const errors: string[] = [];
    if (!env.TMDB_TOKEN?.startsWith("eyJ")) {
        errors.push('TMDB_TOKEN ausente ou inválida (deve começar com "eyJ")');
    }
    if (!POSTGRES_URL.test(env.SYNC_DATABASE_URL ?? "")) {
        errors.push(
            "SYNC_DATABASE_URL ausente ou inválida (conexão direta do papel kinne_sync, postgres://, sem aspas)",
        );
    }
    // C3: o alvo é obrigatório e produção só roda no GitHub Actions.
    if (!SYNC_TARGETS.includes(env.SYNC_TARGET as SyncTarget)) {
        errors.push("SYNC_TARGET ausente ou inválida (develop ou production)");
    } else if (env.SYNC_TARGET === "production") {
        if (env.GITHUB_ACTIONS !== "true") {
            errors.push("SYNC_TARGET=production só roda no GitHub Actions");
        }
        if (!/^https:\/\/[^\s/?#]+$/.test(env.REVALIDATE_ORIGIN ?? "") || !env.REVALIDATE_SECRET) {
            errors.push(
                "REVALIDATE_ORIGIN (https://host) e REVALIDATE_SECRET são obrigatórias em produção",
            );
        }
    }
    return errors;
}

// Só o banco, para os scripts que não falam com o TMDB.
export function dbEnvErrors(env: Record<string, string | undefined>): string[] {
    if (POSTGRES_URL.test(env.DATABASE_URL_POOLED ?? "")) return [];
    return [
        "DATABASE_URL_POOLED ausente ou inválida (deve começar com postgres:// ou postgresql://, sem aspas)",
    ];
}
