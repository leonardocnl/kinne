// Por onde a pessoa chegou à tela do título (US004 RNE001). "link" é a ausência de origem: o
// título aberto por um endereço colado ou por outra aba (C8).
export const STORED_ORIGINS = ["dia", "surpresa", "filtros", "busca"] as const;

export type StoredOrigin = (typeof STORED_ORIGINS)[number];

export type Origin = StoredOrigin | "link";

export const isStoredOrigin = (value: unknown): value is StoredOrigin =>
    typeof value === "string" && (STORED_ORIGINS as readonly string[]).includes(value);
