import { sql } from "drizzle-orm";
import { EMAIL_PATTERN } from "../../domain/accounts";
import {
    bigserial,
    boolean,
    char,
    check,
    date,
    foreignKey,
    index,
    integer,
    pgTable,
    primaryKey,
    real,
    smallint,
    text,
    timestamp,
    unique,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import { catalogTitles } from "@/modules/catalog/infrastructure/db/schema";

export {
    catalogTitles,
    genres,
    catalogTitleGenres,
    themeKeywords,
    catalogTitleThemeKeywords,
    streamingServices,
    streamingAvailability,
    people,
    titleCredits,
    productionCompanies,
    catalogTitleProductionCompanies,
    tmdbRecommendations,
    syncRuns,
    searchCache,
    circuitBreakers,
    searchCounters,
} from "@/modules/catalog/infrastructure/db/schema";

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

// ---------------------------------------------------------------------------------------------
// Contas (US012 a US015, docs/threats/accounts.md). O site não escreve nestas tabelas nem lê as de
// códigos e sessões: tudo passa por funções kinne_* que recebem o hash do token da sessão e
// resolvem a conta lá dentro (migration 0011).

export const users = pgTable(
    "users",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        // o único dado pessoal (US012 RNE001); o kinne_app não lê esta coluna
        email: text("email").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        unique("users_email_unique").on(t.email),
        // o mesmo critério de normalizeEmail (domain/accounts.ts), revisão B4: um endereço só
        check(
            "users_email_check",
            sql`${t.email} = lower(btrim(${t.email})) and char_length(${t.email}) between 3 and 254
                and char_length(split_part(${t.email}, '@', 1)) <= 64
                and ${t.email} ~ ${sql.raw(`'${EMAIL_PATTERN}'`)}`,
        ),
    ],
);

// Códigos de 6 dígitos, só como HMAC com AUTH_SECRET (A5): o hash leva o e-mail e a finalidade.
// Entrar: ligado ao hash do e-mail (a conta só nasce quando o código é confirmado). Apagar a conta:
// ligado à conta que o pediu.
export const signInCodes = pgTable(
    "sign_in_codes",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        purpose: text("purpose").notNull(),
        emailHash: char("email_hash", { length: 64 }),
        userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
        codeHash: char("code_hash", { length: 64 }).notNull(),
        // SHA-256 do cookie de desafio do navegador que pediu o código (M1); só entrar tem
        challengeHash: char("challenge_hash", { length: 64 }),
        attempts: smallint("attempts").notNull().default(0),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        usedAt: timestamp("used_at", { withTimezone: true }),
    },
    (t) => [
        check("sign_in_codes_purpose_check", sql`${t.purpose} in ('sign_in', 'delete_account')`),
        check(
            "sign_in_codes_target_check",
            sql`(${t.purpose} = 'sign_in' and ${t.emailHash} is not null and ${t.userId} is null
                    and ${t.challengeHash} is not null)
                or (${t.purpose} = 'delete_account' and ${t.userId} is not null
                    and ${t.emailHash} is null and ${t.challengeHash} is null)`,
        ),
        check("sign_in_codes_attempts_check", sql`${t.attempts} between 0 and 5`),
        check("sign_in_codes_expiry_check", sql`${t.expiresAt} > ${t.createdAt}`),
        // um código vivo por e-mail (e por conta, para apagar): pedir outro anula o anterior (RNE002)
        uniqueIndex("sign_in_codes_live_email_idx")
            .on(t.emailHash)
            .where(sql`${t.purpose} = 'sign_in' and ${t.usedAt} is null`),
        uniqueIndex("sign_in_codes_live_user_idx")
            .on(t.userId)
            .where(sql`${t.purpose} = 'delete_account' and ${t.usedAt} is null`),
        index("sign_in_codes_expires_at_idx").on(t.expiresAt),
    ],
);

export const userSessions = pgTable(
    "user_sessions",
    {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        // SHA-256 de 32 bytes aleatórios (A2); o cookie nunca vai ao banco
        tokenHash: char("token_hash", { length: 64 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
        // 30 dias renovados com o uso, sem passar do teto de 90 desde o login (RNE005)
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
    },
    (t) => [
        unique("user_sessions_token_hash_unique").on(t.tokenHash),
        check("user_sessions_expiry_check", sql`${t.expiresAt} <= ${t.absoluteExpiresAt}`),
        index("user_sessions_user_idx").on(t.userId),
        index("user_sessions_expires_at_idx").on(t.expiresAt),
    ],
);

export const userStreamings = pgTable(
    "user_streamings",
    {
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        streaming: text("streaming").notNull(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.streaming] }),
        check(
            "user_streamings_streaming_check",
            sql`${t.streaming} in ('netflix', 'max', 'prime-video', 'disney-plus', 'globoplay')`,
        ),
    ],
);

// Um título, um sinal (US009 RNE001): o mais recente vale. Sem cascade no título: a carga do
// catálogo mantém o título inativo enquanto alguém o referencia (titleReferenced).
export const userTasteSignals = pgTable(
    "user_taste_signals",
    {
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        signal: text("signal").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.catalogTitleId] }),
        check(
            "user_taste_signals_signal_check",
            sql`${t.signal} in ('liked', 'will_watch', 'disliked')`,
        ),
        index("user_taste_signals_recent_idx").on(t.userId, t.signal, t.updatedAt),
    ],
);

export const userWatched = pgTable(
    "user_watched",
    {
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        catalogTitleId: integer("catalog_title_id")
            .notNull()
            .references(() => catalogTitles.id),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.catalogTitleId] }),
        index("user_watched_recent_idx").on(t.userId, t.createdAt),
    ],
);

// Um passo sem linha ainda não foi respondido (US013 C5); "skipped" alimenta "Complete seu gosto".
export const userOnboarding = pgTable(
    "user_onboarding",
    {
        userId: integer("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        step: smallint("step").notNull(),
        status: text("status").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        primaryKey({ columns: [t.userId, t.step] }),
        check("user_onboarding_step_check", sql`${t.step} between 1 and 3`),
        check("user_onboarding_status_check", sql`${t.status} in ('done', 'skipped')`),
    ],
);

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

export { meta, rateLimitBuckets } from "@/shared/db/schema";
