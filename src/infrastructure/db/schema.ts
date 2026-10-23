import { sql } from "drizzle-orm";
import {
    bigint,
    bigserial,
    boolean,
    char,
    check,
    date,
    doublePrecision,
    foreignKey,
    index,
    integer,
    jsonb,
    numeric,
    pgTable,
    primaryKey,
    real,
    serial,
    smallint,
    text,
    timestamp,
    unique,
    uuid,
} from "drizzle-orm/pg-core";

export const catalogTitles = pgTable(
    "catalog_titles",
    {
        id: serial("id").primaryKey(),
        tmdbId: integer("tmdb_id").notNull(),
        titleType: text("title_type").notNull(),
        slug: text("slug").notNull().unique(),
        displayTitle: text("display_title").notNull(),
        originalTitle: text("original_title").notNull(),
        tagline: text("tagline"),
        synopsis: text("synopsis"),
        posterImagePath: text("poster_image_path"),
        backdropImagePath: text("backdrop_image_path"),
        trailerYoutubeKey: text("trailer_youtube_key"),
        trailerLanguageCode: char("trailer_language_code", { length: 2 }),
        releaseYear: smallint("release_year"),
        runtimeMinutes: smallint("runtime_minutes"),
        tmdbAverageRating: numeric("tmdb_average_rating", { precision: 3, scale: 1 }).notNull(),
        tmdbVoteCount: integer("tmdb_vote_count").notNull(),
        lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
        backdropWidth: integer("backdrop_width"),
        certificationBr: text("certification_br"),
        certificationSource: text("certification_source").notNull().default("none"),
        isActive: boolean("is_active").notNull().default(true),
        isRecommendable: boolean("is_recommendable").notNull().default(false),
        // Manual (C5): a carga nunca escreve; o papel kinne_sync nem tem UPDATE nesta coluna.
        isBlocked: boolean("is_blocked").notNull().default(false),
        // grafo de gosto (docs/design/taste-graph.md §3): tipo só em série, coleção só em filme
        seriesType: text("series_type"),
        collectionTmdbId: integer("collection_tmdb_id"),
    },
    (t) => [
        check("catalog_titles_title_type_check", sql`${t.titleType} in ('movie', 'series')`),
        check(
            "catalog_titles_certification_br_check",
            sql`${t.certificationBr} in ('L', '10', '12', '14', '16', '18')`,
        ),
        check(
            "catalog_titles_certification_source_check",
            sql`${t.certificationSource} in ('br', 'us', 'none')`,
        ),
        unique("catalog_titles_tmdb_id_title_type_unique").on(t.tmdbId, t.titleType),
        index("catalog_titles_title_type_rating_idx").on(t.titleType, t.tmdbAverageRating),
        index("catalog_titles_runtime_minutes_idx").on(t.runtimeMinutes),
        check(
            "catalog_titles_series_type_check",
            sql`${t.seriesType} in ('miniseries', 'scripted', 'documentary', 'reality', 'talk_show', 'news', 'video')`,
        ),
    ],
);

export const genres = pgTable(
    "genres",
    {
        id: serial("id").primaryKey(),
        tmdbId: integer("tmdb_id").notNull().unique(),
        name: text("name").notNull(),
        kinneGenre: text("kinne_genre"),
    },
    (t) => [
        check(
            "genres_kinne_genre_check",
            sql`${t.kinneGenre} in ('action', 'comedy', 'drama', 'romance', 'suspense')`,
        ),
    ],
);

export const catalogTitleGenres = pgTable(
    "catalog_title_genres",
    {
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        genreId: integer("genre_id")
            .notNull()
            .references(() => genres.id),
    },
    (t) => [
        primaryKey({ columns: [t.catalogTitleId, t.genreId] }),
        index("catalog_title_genres_genre_title_idx").on(t.genreId, t.catalogTitleId),
    ],
);

export const themeKeywords = pgTable("theme_keywords", {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull().unique(),
    name: text("name").notNull(),
});

export const catalogTitleThemeKeywords = pgTable(
    "catalog_title_theme_keywords",
    {
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        themeKeywordId: integer("theme_keyword_id")
            .notNull()
            .references(() => themeKeywords.id),
    },
    (t) => [
        primaryKey({ columns: [t.catalogTitleId, t.themeKeywordId] }),
        index("catalog_title_theme_keywords_keyword_title_idx").on(
            t.themeKeywordId,
            t.catalogTitleId,
        ),
    ],
);

export const streamingServices = pgTable("streaming_services", {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull().unique(),
    name: text("name").notNull(),
    logoImagePath: text("logo_image_path"),
});

export const streamingAvailability = pgTable(
    "streaming_availability",
    {
        streamingServiceId: integer("streaming_service_id")
            .notNull()
            .references(() => streamingServices.id),
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        countryCode: char("country_code", { length: 2 }).notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.streamingServiceId, t.catalogTitleId, t.countryCode] }),
        index("streaming_availability_catalog_title_idx").on(t.catalogTitleId),
    ],
);

export const dailyPicks = pgTable(
    "daily_picks",
    {
        pickDate: date("pick_date").notNull(),
        kinneGenre: text("kinne_genre").notNull(),
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
    },
    (t) => [
        check(
            "daily_picks_kinne_genre_check",
            sql`${t.kinneGenre} in ('action', 'comedy', 'drama', 'romance', 'suspense')`,
        ),
        primaryKey({ columns: [t.pickDate, t.kinneGenre] }),
        index("daily_picks_title_date_idx").on(t.catalogTitleId, t.pickDate),
    ],
);

export const anonymousUsageEvents = pgTable(
    "anonymous_usage_events",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        anonymousBrowserId: uuid("anonymous_browser_id").notNull(),
        eventName: text("event_name").notNull(),
        recommendationSource: text("recommendation_source"),
        catalogTitleId: integer("catalog_title_id").references(() => catalogTitles.id),
        occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check(
            "anonymous_usage_events_event_name_check",
            sql`${t.eventName} in ('app_opened', 'recommendation_shown', 'will_watch_clicked', 'already_watched_clicked', 'another_option_clicked', 'trailer_opened')`,
        ),
        check(
            "anonymous_usage_events_recommendation_source_check",
            sql`${t.recommendationSource} in ('daily_pick', 'filtered', 'surprise_me', 'search')`,
        ),
        index("anonymous_usage_events_occurred_at_idx").on(t.occurredAt),
        index("anonymous_usage_events_browser_occurred_at_idx").on(
            t.anonymousBrowserId,
            t.occurredAt,
        ),
    ],
);

// Elenco e direção (A11): só id do TMDB e nome; nada de foto, aniversário ou biografia.
export const people = pgTable("people", {
    id: serial("id").primaryKey(),
    tmdbPersonId: integer("tmdb_person_id").notNull().unique(),
    name: text("name").notNull(),
});

export const titleCredits = pgTable(
    "title_credits",
    {
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        personId: integer("person_id")
            .notNull()
            .references(() => people.id),
        role: text("role").notNull(),
        creditOrder: smallint("credit_order").notNull(),
    },
    (t) => [
        check(
            "title_credits_role_check",
            sql`${t.role} in ('director', 'cast', 'creator', 'writer')`,
        ),
        primaryKey({ columns: [t.catalogTitleId, t.personId, t.role] }),
        index("title_credits_person_idx").on(t.personId),
    ],
);

export const productionCompanies = pgTable("production_companies", {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull().unique(),
    name: text("name").notNull(),
});

export const catalogTitleProductionCompanies = pgTable(
    "catalog_title_production_companies",
    {
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        productionCompanyId: integer("production_company_id")
            .notNull()
            .references(() => productionCompanies.id),
    },
    (t) => [primaryKey({ columns: [t.catalogTitleId, t.productionCompanyId] })],
);

// Recomendações do TMDB como vieram (ids do TMDB): o recomendado pode nem estar no catálogo. O
// grafo resolve para títulos do catálogo na construção (taste-graph-data A2).
export const tmdbRecommendations = pgTable(
    "tmdb_recommendations",
    {
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        position: smallint("position").notNull(),
        recommendedTmdbId: integer("recommended_tmdb_id").notNull(),
        recommendedTitleType: text("recommended_title_type").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.catalogTitleId, t.position] }),
        check(
            "tmdb_recommendations_type_check",
            sql`${t.recommendedTitleType} in ('movie', 'series')`,
        ),
        check("tmdb_recommendations_position_check", sql`${t.position} between 1 and 20`),
    ],
);

// O grafo de gosto pronto (docs/design/taste-graph.md §2): os vizinhos mais próximos de cada
// título recomendável, guardados nos dois sentidos. Refeito por inteiro todo dia (graph:build).
export const titleNeighbors = pgTable(
    "title_neighbors",
    {
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        neighborTitleId: integer("neighbor_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        proximity: real("proximity").notNull(),
        contentScore: real("content_score").notNull(),
        recommendationScore: real("recommendation_score").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.catalogTitleId, t.neighborTitleId] }),
        check("title_neighbors_not_self_check", sql`${t.catalogTitleId} <> ${t.neighborTitleId}`),
        check("title_neighbors_proximity_check", sql`${t.proximity} > 0 and ${t.proximity} <= 1`),
    ],
);

// Uma linha por execução da carga (E1). Nasce 'failed' e só vira outra coisa no fim: uma carga
// que morre no meio fica registrada como falha.
export const syncRuns = pgTable(
    "sync_runs",
    {
        id: serial("id").primaryKey(),
        startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
        finishedAt: timestamp("finished_at", { withTimezone: true }),
        target: text("target").notNull(),
        status: text("status").notNull().default("failed"),
        // Janela do /changes, em UTC (B12).
        changesWindowStartAt: timestamp("changes_window_start_at", { withTimezone: true }),
        changesWindowEndAt: timestamp("changes_window_end_at", { withTimezone: true }),
        fetchedCount: integer("fetched_count").notNull().default(0),
        insertedCount: integer("inserted_count").notNull().default(0),
        updatedCount: integer("updated_count").notNull().default(0),
        inactivatedCount: integer("inactivated_count").notNull().default(0),
        deletedCount: integer("deleted_count").notNull().default(0),
        rejectedCount: integer("rejected_count").notNull().default(0),
        recommendableCount: integer("recommendable_count").notNull().default(0),
        totalCount: integer("total_count").notNull().default(0),
        activeCount: integer("active_count").notNull().default(0),
        databaseSizeBytes: bigint("database_size_bytes", { mode: "number" }),
        // Linhas do cache da busca no TMDB depois da limpeza (busca B5).
        searchCacheRows: integer("search_cache_rows"),
        abortReason: text("abort_reason"),
    },
    (t) => [
        check("sync_runs_target_check", sql`${t.target} in ('develop', 'production')`),
        check("sync_runs_status_check", sql`${t.status} in ('ok', 'aborted', 'failed', 'skipped')`),
        index("sync_runs_status_started_at_idx").on(t.status, t.startedAt),
    ],
);

// Configuração por banco. A linha 'environment' é gravada à mão em cada branch do Neon (C3).
export const meta = pgTable("meta", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

// Respostas da busca no TMDB (busca G5, C2): a chave é o hash do termo normalizado, nunca o termo.
// "pending" marca quem já está perguntando ao TMDB (G4). Só ids e tipos: nada vai para a tela.
export const searchCache = pgTable(
    "search_cache",
    {
        termHash: text("term_hash").primaryKey(),
        status: text("status").notNull(),
        hits: jsonb("hits").$type<{ tmdbId: number; type: "movie" | "series" }[]>(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    },
    (t) => [
        check("search_cache_status_check", sql`${t.status} in ('pending', 'done')`),
        index("search_cache_created_at_idx").on(t.createdAt),
    ],
);

// Token bucket (busca B1, G15). A chave do visitante é um HMAC do IP com sal diário (E2, G16).
export const rateLimitBuckets = pgTable(
    "rate_limit_buckets",
    {
        key: text("key").primaryKey(),
        tokens: doublePrecision("tokens").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    },
    (t) => [index("rate_limit_buckets_updated_at_idx").on(t.updatedAt)],
);

// Disjuntor da busca no TMDB (B2): aberto até open_until depois de um 429.
export const circuitBreakers = pgTable("circuit_breakers", {
    name: text("name").primaryKey(),
    openUntil: timestamp("open_until", { withTimezone: true }).notNull(),
});

// Contadores diários da busca (F1): sem termos, sem identificadores.
export const searchCounters = pgTable(
    "search_counters",
    {
        day: date("day").notNull(),
        name: text("name").notNull(),
        count: integer("count").notNull(),
    },
    (t) => [primaryKey({ columns: [t.day, t.name] })],
);

// ---------------------------------------------------------------------------------------------
// Sala de grupo (US011, docs/threats/group-room.md). Tudo é apagado quando a sala expira: o
// `delete` em group_rooms leva as filhas junto (cascade) e só passa por kinne_purge_group_rooms
// (site, SECURITY DEFINER) ou pelo papel kinne_sync (limpeza diária).

export const groupRooms = pgTable(
    "group_rooms",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        // 8 caracteres de um alfabeto de 31, sem 0, O, 1, I, L (RNE001)
        code: text("code").notNull(),
        phase: text("phase").notNull().default("lobby"),
        round: smallint("round").notNull().default(1),
        // escolhidos por quem criou (C5)
        typeChoice: text("type_choice").notNull().default("both"),
        maxRuntimeMinutes: smallint("max_runtime_minutes"),
        // HMAC do código do navegador de quem criou, só para o limite de 3 salas por hora (D1)
        creatorKeyHash: text("creator_key_hash").notNull(),
        // quem criou hoje; passa à pessoa mais antiga se ela sair (C11). Nula só durante a criação
        creatorMemberId: integer("creator_member_id"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        // criação + 3 h; no resultado, no máximo resultado + 30 min (C10)
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        resultAt: timestamp("result_at", { withTimezone: true }),
    },
    (t) => [
        unique("group_rooms_code_unique").on(t.code),
        check("group_rooms_code_check", sql`${t.code} ~ '^[2-9A-HJKMNP-Z]{8}$'`),
        check("group_rooms_phase_check", sql`${t.phase} in ('lobby', 'voting', 'result')`),
        check("group_rooms_round_check", sql`${t.round} between 1 and 3`),
        check("group_rooms_type_check", sql`${t.typeChoice} in ('movie', 'series', 'both')`),
        check(
            "group_rooms_runtime_check",
            sql`${t.maxRuntimeMinutes} is null or ${t.maxRuntimeMinutes} in (90, 105, 120)`,
        ),
        check("group_rooms_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
        index("group_rooms_expires_at_idx").on(t.expiresAt),
        index("group_rooms_creator_key_idx").on(t.creatorKeyHash, t.createdAt),
    ],
);

export const groupRoomMembers = pgTable(
    "group_room_members",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        roomId: integer("room_id")
            .notNull()
            .references(() => groupRooms.id, { onDelete: "cascade" }),
        // ordem de entrada: "Pessoa N" (RNE004). Quem sai guarda o número; até 8 pessoas na sala
        // ao mesmo tempo (RNE008), por isso o teto de 16 entradas no total
        position: smallint("position").notNull(),
        // SHA-256 do cookie de membro (A2); nulo depois de sair
        tokenHash: char("token_hash", { length: 64 }),
        ready: boolean("ready").notNull().default(false),
        streamings: text("streamings")
            .array()
            .notNull()
            .default(sql`'{}'`),
        genres: text("genres")
            .array()
            .notNull()
            .default(sql`'{}'`),
        // o que o navegador mandou ao entrar (RNE009); apagado ao sair
        watchedIds: integer("watched_ids")
            .array()
            .notNull()
            .default(sql`'{}'`),
        likedIds: integer("liked_ids")
            .array()
            .notNull()
            .default(sql`'{}'`),
        willWatchIds: integer("will_watch_ids")
            .array()
            .notNull()
            .default(sql`'{}'`),
        dislikedIds: integer("disliked_ids")
            .array()
            .notNull()
            .default(sql`'{}'`),
        joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
        leftAt: timestamp("left_at", { withTimezone: true }),
    },
    (t) => [
        unique("group_room_members_token_hash_unique").on(t.tokenHash),
        unique("group_room_members_room_position_unique").on(t.roomId, t.position),
        // alvo da chave composta dos votos: o voto é de um membro da mesma sala
        unique("group_room_members_room_id_id_unique").on(t.roomId, t.id),
        check("group_room_members_position_check", sql`${t.position} between 1 and 16`),
        check(
            "group_room_members_streamings_check",
            sql`${t.streamings} <@ array['netflix', 'max', 'prime-video', 'disney-plus', 'globoplay']::text[]`,
        ),
        check(
            "group_room_members_genres_check",
            sql`${t.genres} <@ array['action', 'comedy', 'drama', 'romance', 'suspense']::text[]`,
        ),
        check(
            "group_room_members_sizes_check",
            sql`coalesce(cardinality(${t.watchedIds}), 0) <= 1000
                and coalesce(cardinality(${t.likedIds}), 0) <= 200
                and coalesce(cardinality(${t.willWatchIds}), 0) <= 200
                and coalesce(cardinality(${t.dislikedIds}), 0) <= 200`,
        ),
        // quem saiu não guarda cookie
        check("group_room_members_left_check", sql`${t.leftAt} is null or ${t.tokenHash} is null`),
    ],
);

export const groupRoomFinalists = pgTable(
    "group_room_finalists",
    {
        roomId: integer("room_id")
            .notNull()
            .references(() => groupRooms.id, { onDelete: "cascade" }),
        round: smallint("round").notNull(),
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        position: smallint("position").notNull(),
        // o percentil do membro menos satisfeito (design §7); nulo sem nenhum sinal de gosto
        groupScore: real("group_score"),
    },
    (t) => [
        primaryKey({ columns: [t.roomId, t.round, t.catalogTitleId] }),
        unique("group_room_finalists_position_unique").on(t.roomId, t.round, t.position),
        check("group_room_finalists_round_check", sql`${t.round} between 1 and 3`),
        check("group_room_finalists_position_check", sql`${t.position} between 1 and 5`),
    ],
);

export const groupRoomVotes = pgTable(
    "group_room_votes",
    {
        roomId: integer("room_id").notNull(),
        round: smallint("round").notNull(),
        memberId: integer("member_id").notNull(),
        catalogTitleId: integer("catalog_title_id").notNull(),
        // uma linha por finalista a cada "Votar": votar de novo troca a cédula (B1)
        approved: boolean("approved").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.roomId, t.round, t.memberId, t.catalogTitleId] }),
        foreignKey({
            columns: [t.roomId, t.round, t.catalogTitleId],
            foreignColumns: [
                groupRoomFinalists.roomId,
                groupRoomFinalists.round,
                groupRoomFinalists.catalogTitleId,
            ],
            name: "group_room_votes_finalist_fk",
        }).onDelete("cascade"),
        foreignKey({
            columns: [t.roomId, t.memberId],
            foreignColumns: [groupRoomMembers.roomId, groupRoomMembers.id],
            name: "group_room_votes_member_fk",
        }).onDelete("cascade"),
    ],
);
