-- Busca de títulos (threat model docs/threats/title-search.md).

-- G14: uma normalização só, usada no índice e na consulta; espelhada por normalizeSearchText em
-- src/domain/search.ts. O dicionário explícito torna a função imutável de verdade.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE OR REPLACE FUNCTION kinne_normalize(value text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    RETURN public.unaccent('public.unaccent'::regdictionary, lower(value));--> statement-breakpoint

-- B4: trigramas no título em português e no original, os dois campos que a busca compara.
CREATE INDEX IF NOT EXISTS catalog_titles_display_title_search_idx
    ON catalog_titles USING gin (kinne_normalize(display_title) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_titles_original_title_search_idx
    ON catalog_titles USING gin (kinne_normalize(original_title) gin_trgm_ops);--> statement-breakpoint

-- Token bucket (B1, G15): tira uma ficha de cada chave, todas ou nenhuma, numa ida ao banco.
-- 'open' quando o disjuntor indicado está aberto (B2), 'limited' quando falta ficha.
CREATE OR REPLACE FUNCTION kinne_take_tokens(
    p_keys text[],
    p_capacity double precision[],
    p_per_second double precision[],
    p_breaker text DEFAULT NULL
) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
    i int;
    available double precision;
BEGIN
    IF p_breaker IS NOT NULL AND EXISTS (
        SELECT 1 FROM circuit_breakers WHERE name = p_breaker AND open_until > now()
    ) THEN
        RETURN 'open';
    END IF;
    INSERT INTO rate_limit_buckets (key, tokens, updated_at)
        SELECT k, c, now() FROM unnest(p_keys, p_capacity) AS t(k, c)
        ON CONFLICT (key) DO NOTHING;
    -- Ordem fixa de travamento: dois pedidos que dividem a chave global não se travam.
    PERFORM 1 FROM rate_limit_buckets WHERE key = ANY (p_keys) ORDER BY key FOR UPDATE;
    FOR i IN 1 .. array_length(p_keys, 1) LOOP
        SELECT least(p_capacity[i], tokens + extract(epoch FROM now() - updated_at) * p_per_second[i])
            INTO available FROM rate_limit_buckets WHERE key = p_keys[i];
        IF available < 1 THEN
            RETURN 'limited';
        END IF;
    END LOOP;
    UPDATE rate_limit_buckets b
        SET tokens = least(t.c, b.tokens + extract(epoch FROM now() - b.updated_at) * t.r) - 1,
            updated_at = now()
        FROM unnest(p_keys, p_capacity, p_per_second) AS t(k, c, r)
        WHERE b.key = t.k;
    RETURN 'ok';
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_take_tokens(text[], double precision[], double precision[], text) FROM PUBLIC;--> statement-breakpoint

-- Papel do site (security.md §4, busca E1). Sem DDL, sem senha aqui: o login é ligado fora do
-- Git, uma vez por branch do Neon:
--   ALTER ROLE kinne_app WITH LOGIN PASSWORD '<senha aleatória>';
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kinne_app') THEN
        CREATE ROLE kinne_app NOLOGIN;
    END IF;
END
$$;--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM kinne_app;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO kinne_app;--> statement-breakpoint
GRANT SELECT ON
    catalog_titles, genres, catalog_title_genres, theme_keywords, catalog_title_theme_keywords,
    streaming_services, streaming_availability, people, title_credits, daily_picks
TO kinne_app;--> statement-breakpoint
-- A cópia diária da tela inicial grava o dia que falta (dailyPicksFor).
GRANT INSERT ON daily_picks TO kinne_app;--> statement-breakpoint
GRANT INSERT ON anonymous_usage_events TO kinne_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE anonymous_usage_events_id_seq TO kinne_app;--> statement-breakpoint
-- Busca: cache do TMDB, fichas, disjuntor e contadores; nada de DELETE (a limpeza é da carga).
GRANT SELECT, INSERT, UPDATE ON search_cache, rate_limit_buckets, circuit_breakers, search_counters
TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_take_tokens(text[], double precision[], double precision[], text)
TO kinne_app;--> statement-breakpoint

-- A carga diária limpa o que expirou (B5, G15) e lê os contadores para o resumo (F1).
GRANT SELECT, DELETE ON search_cache, rate_limit_buckets, search_counters TO kinne_sync;
