-- Revisão de segurança do PR #19 (L3): o site não escreve mais direto nas fichas nem no
-- disjuntor. As duas funções rodam com os direitos do dono, com search_path fixo, e kinne_app só
-- pode chamá-las.
ALTER FUNCTION kinne_take_tokens(text[], double precision[], double precision[], text)
    SECURITY DEFINER SET search_path = pg_catalog, public;--> statement-breakpoint
CREATE OR REPLACE FUNCTION kinne_trip_breaker(p_name text, p_cooldown interval) RETURNS void
    LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
    BEGIN ATOMIC
        INSERT INTO circuit_breakers (name, open_until)
            VALUES (p_name, now() + least(p_cooldown, interval '1 hour'))
            ON CONFLICT (name) DO UPDATE SET open_until = excluded.open_until;
    END;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_trip_breaker(text, interval) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_trip_breaker(text, interval) TO kinne_app;--> statement-breakpoint
REVOKE ALL ON rate_limit_buckets, circuit_breakers FROM kinne_app;
