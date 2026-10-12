import { MAX_RAW_TERM_LENGTH, normalizeSearchText } from "./search";

// Busca de pessoas nos filtros (threat model docs/threats/person-search.md).

// B2: abaixo de 3 caracteres o índice de trigramas não ajuda, e a busca vira varredura.
export const MIN_PERSON_TERM_LENGTH = 3;
export const MAX_PERSON_TERM_LENGTH = 80;
export const MAX_PERSON_RESULTS = 6;
// B6: teto de títulos de uma pessoa no contador e no sorteio
export const MAX_PERSON_TITLES = 2000;
// A6: o maior id do Postgres (integer)
export const MAX_PERSON_ID = 2_147_483_647;
const MAX_NAME_LENGTH = 200;

export const PERSON_ROLES = ["cast", "director"] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

export const ROLE_LABELS: Record<PersonRole, string> = { cast: "Atuação", director: "Direção" };

export type PersonSuggestion = {
    id: number;
    name: string;
    // o papel em que mais aparece nos títulos recomendáveis
    role: PersonRole;
    // quantos títulos recomendáveis do catálogo têm a pessoa
    titles: number;
};

// C4: "não achou" e "não deu" são respostas diferentes na tela.
export type PersonOutcome =
    { kind: "results"; people: PersonSuggestion[] } | { kind: "none" } | { kind: "unavailable" };

/** A pessoa escolhida no filtro: o que o painel guarda e mostra na pílula. */
export type PersonPick = { id: number; name: string; role: PersonRole };

/** O termo digitado, pronto para buscar pessoas, ou null se não serve (A3, B2). */
export function parsePersonTerm(raw: string): string | null {
    if (raw.length > MAX_RAW_TERM_LENGTH) return null;
    const term = normalizeSearchText(raw);
    const length = [...term].length;
    return length >= MIN_PERSON_TERM_LENGTH && length <= MAX_PERSON_TERM_LENGTH ? term : null;
}

export const isPersonId = (value: unknown): value is number =>
    Number.isSafeInteger(value) && (value as number) > 0 && (value as number) <= MAX_PERSON_ID;

/** Pessoa lida do navegador (sessionStorage): só passa no formato esperado (A9). */
export function parsePersonPick(value: unknown): PersonPick | null {
    if (typeof value !== "object" || value === null) return null;
    const { id, name, role, ...rest } = value as Record<string, unknown>;
    if (Object.keys(rest).length > 0) return null;
    if (!isPersonId(id) || typeof name !== "string") return null;
    const clean = name.trim();
    if (clean.length === 0 || clean.length > MAX_NAME_LENGTH) return null;
    if (!PERSON_ROLES.includes(role as PersonRole)) return null;
    return { id, name: clean, role: role as PersonRole };
}

/** "37 títulos", "1 título". */
export const titleCount = (n: number) => (n === 1 ? "1 título" : `${n} títulos`);
