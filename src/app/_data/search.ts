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

// B3: o mesmo termo não volta ao banco; a carga invalida pela etiqueta do catálogo (C4).
async function cachedCatalog(term: string): Promise<SearchResult[]> {
    "use cache: remote";
    cacheLife("hours");
    cacheTag(CATALOG_TAG);
    return repository().catalog(term);
}

const catalog = (term: string) =>
    [...term].length >= MIN_CACHED_LENGTH ? cachedCatalog(term) : repository().catalog(term);

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
