// Confere as variáveis da carga antes de qualquer requisição. Nunca inclui o valor na mensagem.
export function syncEnvErrors(env: Record<string, string | undefined>): string[] {
    const errors: string[] = [];
    if (!env.TMDB_TOKEN?.startsWith("eyJ")) {
        errors.push('TMDB_TOKEN ausente ou inválida (deve começar com "eyJ")');
    }
    return [...errors, ...dbEnvErrors(env)];
}

// Só o banco, para os scripts que não falam com o TMDB.
export function dbEnvErrors(env: Record<string, string | undefined>): string[] {
    if (/^postgres(ql)?:\/\/[^"'\s]+$/.test(env.DATABASE_URL_POOLED ?? "")) return [];
    return [
        "DATABASE_URL_POOLED ausente ou inválida (deve começar com postgres:// ou postgresql://, sem aspas)",
    ];
}
