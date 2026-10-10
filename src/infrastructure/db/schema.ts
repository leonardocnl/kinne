import { sql } from "drizzle-orm";
import {
    bigserial,
    char,
    check,
    date,
    index,
    integer,
    numeric,
    pgTable,
    primaryKey,
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
    },
    (t) => [
        check("catalog_titles_title_type_check", sql`${t.titleType} in ('movie', 'series')`),
        unique("catalog_titles_tmdb_id_title_type_unique").on(t.tmdbId, t.titleType),
        index("catalog_titles_title_type_rating_idx").on(t.titleType, t.tmdbAverageRating),
        index("catalog_titles_runtime_minutes_idx").on(t.runtimeMinutes),
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
            sql`${t.recommendationSource} in ('daily_pick', 'filtered', 'surprise_me')`,
        ),
        index("anonymous_usage_events_occurred_at_idx").on(t.occurredAt),
        index("anonymous_usage_events_browser_occurred_at_idx").on(
            t.anonymousBrowserId,
            t.occurredAt,
        ),
    ],
);
