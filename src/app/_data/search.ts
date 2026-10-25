import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CounterName, TitleSearchPorts } from "@/application/title-search";
import type { SearchResult } from "@/domain/search";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleSearchRepository } from "@/infrastructure/db/search-repository";
import { CATALOG_TAG } from "@/infrastructure/revalidation";
import type { SearchConfig } from "@/infrastructure/search-config";
import { searchTmdb, TmdbRateLimitedError } from "@/infrastructure/tmdb/search";

const MIN_CACHED_LENGTH = 3; // G6
const COUNTER_FLUSH_MS = 60_000;

const repository = () => new DrizzleSearchRepository(createDb());

// C2: a chave do cache compartilhado é feita dos argumentos, então ele recebe só o hash. O termo
// fica na memória desta instância enquanto o pedido roda, só para o caso de o cache não ter a
// resposta.
const termsInFlight = new Map<string, { term: string; users: number }>();

// B3: o mesmo termo não volta ao banco; a carga invalida pela etiqueta do catálogo (C4).
async function cachedCatalog(termHash: string): Promise<SearchResult[]> {
    "use cache: remote";
    cacheLife("hours");
    cacheTag(CATALOG_TAG);
    const entry = termsInFlight.get(termHash);
    // erro não fica em cache: o próximo pedido tenta de novo
    if (!entry) throw new Error("Termo da busca indisponível");
    return repository().catalog(entry.term);
}

export async function catalog(term: string, termHash: string): Promise<SearchResult[]> {
    if ([...term].length < MIN_CACHED_LENGTH) return repository().catalog(term);
    const entry = termsInFlight.get(termHash) ?? { term, users: 0 };
    entry.users++;
    termsInFlight.set(termHash, entry);
    try {
        return await cachedCatalog(termHash);
    } finally {
        if (--entry.users === 0) termsInFlight.delete(termHash);
    }
}

// F1: contadores somados na instância e gravados no máximo uma vez por minuto, para que
// pedidos recusados não cheguem ao banco a cada vez (B7).
// ponytail: o que a instância somou e não gravou some com ela; contagem aproximada basta para F1.
const pending = new Map<CounterName, number>();
let lastFlush = 0;

export function countSearch(name: CounterName) {
    pending.set(name, (pending.get(name) ?? 0) + 1);
}

export async function flushSearchCounters(): Promise<void> {
    if (pending.size === 0 || Date.now() - lastFlush < COUNTER_FLUSH_MS) return;
    lastFlush = Date.now();
    const counts = new Map(pending);
    pending.clear();
    await repository().addCounts(counts);
}

export function searchPorts(config: SearchConfig): TitleSearchPorts {
    const db = repository();
    return {
        catalog,
        catalogByTmdb: (hits) => db.catalogByTmdb(hits),
        cached: (termHash) => db.cached(termHash),
        claim: (termHash) => db.claim(termHash),
        save: (termHash, hits) => db.save(termHash, hits),
        admit: (clientKey) => db.admit(clientKey, config),
        tmdb: (term) => searchTmdb(term, process.env.TMDB_TOKEN ?? ""),
        isRateLimited: (error) => error instanceof TmdbRateLimitedError,
        tripBreaker: () => db.tripBreaker(),
        count: countSearch,
    };
}
