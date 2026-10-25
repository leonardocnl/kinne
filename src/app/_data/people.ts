import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PersonSuggestion } from "@/domain/person-search";
import { createDb } from "@/infrastructure/db/client";
import { DrizzlePeopleRepository } from "@/infrastructure/db/people-repository";
import { CATALOG_TAG, LISTS_TAG } from "@/infrastructure/revalidation";

const repository = () => new DrizzlePeopleRepository(createDb());

// C1: a chave do cache compartilhado é feita dos argumentos, então ele recebe só o hash do termo,
// como na busca de títulos. O termo fica na memória desta instância enquanto o pedido roda.
const termsInFlight = new Map<string, { term: string; users: number }>();

// B3: o mesmo termo não volta ao banco; a carga invalida pela etiqueta do catálogo.
async function cachedSuggestions(termHash: string): Promise<PersonSuggestion[]> {
    "use cache: remote";
    cacheLife("hours");
    cacheTag(CATALOG_TAG);
    const entry = termsInFlight.get(termHash);
    // erro não fica em cache: o próximo pedido tenta de novo
    if (!entry) throw new Error("Termo da busca indisponível");
    return repository().suggestions(entry.term);
}

export async function personSuggestions(
    term: string,
    termHash: string,
): Promise<PersonSuggestion[]> {
    const entry = termsInFlight.get(termHash) ?? { term, users: 0 };
    entry.users++;
    termsInFlight.set(termHash, entry);
    try {
        return await cachedSuggestions(termHash);
    } finally {
        if (--entry.users === 0) termsInFlight.delete(termHash);
    }
}

/** Os títulos sorteáveis de uma pessoa, em cache por um dia, como a lista dos filtros (B3). */
export async function personTitleIds(personId: number): Promise<number[]> {
    "use cache: remote";
    cacheLife("days");
    cacheTag(CATALOG_TAG, LISTS_TAG);
    return repository().titleIds(personId);
}
