// Confere as variáveis da carga antes de qualquer requisição. Nunca inclui o valor na mensagem.
export function syncEnvErrors(env: Record<string, string | undefined>): string[] {
    const errors: string[] = [];
    if (!env.TMDB_TOKEN?.startsWith("eyJ")) {
        errors.push('TMDB_TOKEN ausente ou inválida (deve começar com "eyJ")');
    }
    if (!/^postgres(ql)?:\/\/[^"'\s]+$/.test(env.DATABASE_URL_POOLED ?? "")) {
        errors.push(
            "DATABASE_URL_POOLED ausente ou inválida (deve começar com postgres:// ou postgresql://, sem aspas)",
        );
    }
    return errors;
}
