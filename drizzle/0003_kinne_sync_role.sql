-- Papel da carga do catálogo (threat model catalog-sync, C1). Sem DDL, sem senha aqui:
-- o login é ligado fora do Git, uma vez por branch do Neon:
--   ALTER ROLE kinne_sync WITH LOGIN PASSWORD '<senha aleatória>';
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kinne_sync') THEN
        CREATE ROLE kinne_sync NOLOGIN;
    END IF;
END
$$;--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM kinne_sync;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO kinne_sync;--> statement-breakpoint
-- slug e is_blocked ficam fora do UPDATE: o slug é fixo na criação (B9) e o bloqueio é manual (C5).
GRANT SELECT, INSERT, DELETE ON catalog_titles TO kinne_sync;--> statement-breakpoint
GRANT UPDATE (
    display_title, original_title, tagline, synopsis, poster_image_path, backdrop_image_path,
    backdrop_width, trailer_youtube_key, trailer_language_code, release_year, runtime_minutes,
    tmdb_average_rating, tmdb_vote_count, last_synced_at, certification_br, certification_source,
    is_active, is_recommendable
) ON catalog_titles TO kinne_sync;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON
    genres, catalog_title_genres, theme_keywords, catalog_title_theme_keywords,
    streaming_availability, people, title_credits, sync_runs
TO kinne_sync;--> statement-breakpoint
-- daily:pick roda no mesmo job com a mesma conexão.
GRANT SELECT, INSERT ON daily_picks TO kinne_sync;--> statement-breakpoint
GRANT SELECT ON streaming_services, meta, anonymous_usage_events TO kinne_sync;--> statement-breakpoint
GRANT USAGE ON SEQUENCE
    catalog_titles_id_seq, genres_id_seq, theme_keywords_id_seq, people_id_seq, sync_runs_id_seq
TO kinne_sync;
