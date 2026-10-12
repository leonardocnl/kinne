import type { TitleType } from "@/domain/catalog";
import type { SearchOutcome, SearchResult } from "@/domain/search";

// Busca de títulos (threat model docs/threats/title-search.md): primeiro o catálogo; só quando
// ele não acha nada, o TMDB, com cache de um dia, limites e disjuntor.

export type TmdbHit = { tmdbId: number; type: TitleType };

export type CachedAnswer = { status: "pending" } | { status: "done"; hits: TmdbHit[] };

export type Admission = "ok" | "limited" | "open";

export type CounterName = "catalog_searches" | "tmdb_fallbacks" | "rate_limited" | "breaker_trips";

export interface TitleSearchPorts {
    /** títulos ativos e não bloqueados cujo título em português ou original contém o termo */
    catalog(term: string, termHash: string): Promise<SearchResult[]>;
    /** os mesmos filtros (G9), pelos ids do TMDB */
    catalogByTmdb(hits: TmdbHit[]): Promise<SearchResult[]>;
    /** resposta do TMDB ainda válida para este termo, ou null */
    cached(termHash: string): Promise<CachedAnswer | null>;
    /** marca o termo como "perguntando ao TMDB"; false se outro pedido chegou antes (G4) */
    claim(termHash: string): Promise<boolean>;
    save(termHash: string, hits: TmdbHit[]): Promise<void>;
    /** ficha do visitante e do orçamento global, se o disjuntor estiver fechado (B1, B2) */
    admit(clientKey: string): Promise<Admission>;
    tmdb(term: string): Promise<TmdbHit[]>;
    isRateLimited(error: unknown): boolean;
    tripBreaker(): Promise<void>;
    count(name: CounterName): void;
}

export type SearchRequest = {
    term: string;
    termHash: string;
    // null quando o limitador não consegue decidir (sem segredo): sem TMDB (E3)
    clientKey: string | null;
    fallback: boolean;
};

const UNAVAILABLE = { kind: "unavailable" } as const;

// G4: dentro da instância, quem pede o mesmo termo ao mesmo tempo espera a mesma resposta.
const inFlight = new Map<string, Promise<SearchOutcome>>();

export async function searchTitles(
    request: SearchRequest,
    ports: TitleSearchPorts,
): Promise<SearchOutcome> {
    ports.count("catalog_searches");
    const results = await ports.catalog(request.term, request.termHash);
    if (results.length) return { kind: "results", results };
    if (!request.fallback) return { kind: "none" };

    const running = inFlight.get(request.termHash);
    if (running) return running;
    const answer = fallback(request, ports).finally(() => inFlight.delete(request.termHash));
    inFlight.set(request.termHash, answer);
    return answer;
}

async function fallback(
    { term, termHash, clientKey }: SearchRequest,
    ports: TitleSearchPorts,
): Promise<SearchOutcome> {
    const cached = await ports.cached(termHash);
    // G4: outra instância está perguntando agora; não esperar por ela
    if (cached?.status === "pending") return UNAVAILABLE;
    if (cached) return fromHits(cached.hits, ports);

    if (!clientKey) return UNAVAILABLE;
    let admission: Admission;
    try {
        admission = await ports.admit(clientKey);
    } catch {
        // E3: limitador fora do ar é "não"
        return UNAVAILABLE;
    }
    if (admission !== "ok") {
        if (admission === "limited") ports.count("rate_limited");
        return UNAVAILABLE;
    }
    if (!(await ports.claim(termHash))) return UNAVAILABLE;

    ports.count("tmdb_fallbacks");
    let hits: TmdbHit[];
    try {
        hits = await ports.tmdb(term);
    } catch (error) {
        if (ports.isRateLimited(error)) {
            ports.count("breaker_trips");
            await ports.tripBreaker();
        }
        // a marca "pending" expira sozinha e libera uma nova tentativa
        return UNAVAILABLE;
    }
    // G5: "nada no TMDB" também fica guardado
    await ports.save(termHash, hits);
    return fromHits(hits, ports);
}

async function fromHits(hits: TmdbHit[], ports: TitleSearchPorts): Promise<SearchOutcome> {
    if (hits.length === 0) return { kind: "none" };
    const results = await ports.catalogByTmdb(hits);
    return results.length ? { kind: "results", results } : { kind: "elsewhere" };
}
