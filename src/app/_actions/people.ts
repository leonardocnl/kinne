"use server";

import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { MAX_PERSON_ID, parsePersonTerm, type PersonOutcome } from "@/domain/person-search";
import { MAX_RAW_TERM_LENGTH } from "@/domain/search";
import { personSuggestions, personTitleIds } from "../_data/people";
import { admitPersonQuery } from "../_data/person-limit";

const DEADLINE_MS = 5_000;
const UNAVAILABLE = { kind: "unavailable" } as const;

// A3: o tamanho bruto é conferido antes de qualquer normalização.
const searchSchema = z.strictObject({ term: z.string().max(MAX_RAW_TERM_LENGTH) });
// A6
const personSchema = z.strictObject({ personId: z.int().min(1).max(MAX_PERSON_ID) });

function withDeadline<T>(work: Promise<T>, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), DEADLINE_MS);
    });
    return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/**
 * Sugestões de "Buscar ator ou diretor" (threat model docs/threats/person-search.md). O termo
 * chega só no corpo do POST e nunca vai para o log nem para o banco (A8, C1).
 */
export async function searchPeople(input: unknown): Promise<PersonOutcome> {
    const parsed = searchSchema.safeParse(input);
    const term = parsed.success ? parsePersonTerm(parsed.data.term) : null;
    if (!term) return { kind: "none" };
    // B1: recusa antes de qualquer consulta
    if (!(await admitPersonQuery())) return UNAVAILABLE;
    try {
        const termHash = createHash("sha256").update(term).digest("hex");
        const people = await withDeadline(personSuggestions(term, termHash), null);
        if (!people) return UNAVAILABLE;
        return people.length ? { kind: "results", people } : { kind: "none" };
    } catch {
        // C1, C4: mensagem fixa; nem o termo nem o erro do banco vão para o log
        console.error("Busca de pessoas falhou");
        return UNAVAILABLE;
    }
}

/**
 * Os títulos sorteáveis da pessoa escolhida, para o contador do painel, que conta no navegador.
 * O sorteio não usa esta lista: o servidor a deriva de novo (A7). Null quando não deu.
 */
export async function personTitles(input: unknown): Promise<number[] | null> {
    const parsed = personSchema.safeParse(input);
    if (!parsed.success) return null;
    if (!(await admitPersonQuery())) return null;
    try {
        return await withDeadline(personTitleIds(parsed.data.personId), null);
    } catch {
        console.error("Títulos da pessoa não carregados");
        return null;
    }
}
