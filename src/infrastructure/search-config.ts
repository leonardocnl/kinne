import "server-only";
import { z } from "zod";

// Limites da busca, lidos a cada pedido (H1, I2): mudar exige só um redeploy do mesmo build.
// Padrões pensados para uma sala de aula atrás de um IP só (H1): o limite apertado é o orçamento
// global do TMDB, não o limite por visitante.
const count = (fallback: number) => z.coerce.number().int().min(1).max(1_000_000).default(fallback);

const schema = z.object({
    SEARCH_TMDB_FALLBACK: z.enum(["on", "off"]).default("off"),
    RATE_LIMIT_SECRET: z.string().min(32).optional(),
    // por visitante e por instância, na busca no catálogo
    SEARCH_CATALOG_PER_MINUTE: count(600),
    // por visitante, na busca no TMDB
    SEARCH_FALLBACK_PER_MINUTE: count(60),
    // para todos os visitantes juntos, bem abaixo do limite do TMDB, para sobrar para a carga (B2)
    SEARCH_TMDB_PER_MINUTE: count(30),
    SEARCH_TMDB_PER_DAY: count(2000),
});

export type SearchConfig = {
    fallback: boolean;
    secret: string | undefined;
    catalogPerMinute: number;
    fallbackPerMinute: number;
    tmdbPerMinute: number;
    tmdbPerDay: number;
};

/** Variável inválida desliga a busca no TMDB (falha fechada) e usa os padrões no catálogo. */
export function searchConfig(env: Record<string, string | undefined> = process.env): SearchConfig {
    // variável vazia (como em .env.example) vale como ausente
    const parsed = schema.safeParse(
        Object.fromEntries(Object.entries(env).filter(([, value]) => value !== "")),
    );
    const c = parsed.success ? parsed.data : schema.parse({});
    return {
        fallback: parsed.success && c.SEARCH_TMDB_FALLBACK === "on" && Boolean(env.TMDB_TOKEN),
        secret: c.RATE_LIMIT_SECRET,
        catalogPerMinute: c.SEARCH_CATALOG_PER_MINUTE,
        fallbackPerMinute: c.SEARCH_FALLBACK_PER_MINUTE,
        tmdbPerMinute: c.SEARCH_TMDB_PER_MINUTE,
        tmdbPerDay: c.SEARCH_TMDB_PER_DAY,
    };
}
