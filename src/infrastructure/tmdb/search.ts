import "server-only";
import type { TmdbHit } from "@/application/title-search";
import { readCapped, TmdbHttpError } from "./client";
import { searchMultiSchema } from "./schemas";

const SEARCH_URL = "https://api.themoviedb.org/3/search/multi";
const TIMEOUT_MS = 3_000; // B6
const MAX_HITS = 20;

// 429 do TMDB: abre o disjuntor da busca (B2).
export class TmdbRateLimitedError extends TmdbHttpError {
    constructor() {
        super(429, "/search/multi");
    }
}

/** Uma tentativa só, sem retry: quem espera é o visitante, e o orçamento conta cada chamada. */
export async function searchTmdb(
    term: string,
    token: string,
    fetchFn: typeof fetch = fetch,
): Promise<TmdbHit[]> {
    // A6: caminho fixo; o termo só entra como valor, e include_adult vem depois dele
    const url = new URL(SEARCH_URL);
    url.searchParams.set("query", term);
    url.searchParams.set("language", "pt-BR");
    url.searchParams.set("page", "1");
    url.searchParams.set("include_adult", "false");
    const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "error",
    });
    if (res.status === 429) throw new TmdbRateLimitedError();
    if (!res.ok) throw new TmdbHttpError(res.status, "/search/multi");
    const { results } = searchMultiSchema.parse(JSON.parse(await readCapped(res, "/search/multi")));
    const unique = new Map(results.map((h) => [`${h.type}:${h.tmdbId}`, h]));
    return [...unique.values()].slice(0, MAX_HITS);
}
