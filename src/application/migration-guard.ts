// Trava das migrations automáticas: o workflow só pode tocar um banco marcado como develop.
export const MIGRATION_TARGET = "develop";

// Decisão pura sobre o valor de meta.environment. Valor ausente, vazio ou diferente recusa.
export function migrationTargetAllowed(environment: string | null | undefined): boolean {
    return environment === MIGRATION_TARGET;
}

// Depois da migration, o banco precisa ter ao menos tantas migrations quanto o repositório.
export function migrationsBehind(applied: number, expected: number): boolean {
    return !Number.isInteger(applied) || applied < expected;
}
