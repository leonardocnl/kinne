CREATE TABLE "anonymous_usage_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"anonymous_browser_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"recommendation_source" text,
	"catalog_title_id" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anonymous_usage_events_event_name_check" CHECK ("anonymous_usage_events"."event_name" in ('app_opened', 'recommendation_shown', 'will_watch_clicked', 'already_watched_clicked', 'another_option_clicked', 'trailer_opened')),
	CONSTRAINT "anonymous_usage_events_recommendation_source_check" CHECK ("anonymous_usage_events"."recommendation_source" in ('daily_pick', 'filtered', 'surprise_me'))
);
--> statement-breakpoint
CREATE TABLE "catalog_title_genres" (
	"catalog_title_id" integer NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "catalog_title_genres_catalog_title_id_genre_id_pk" PRIMARY KEY("catalog_title_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_title_theme_keywords" (
	"catalog_title_id" integer NOT NULL,
	"theme_keyword_id" integer NOT NULL,
	CONSTRAINT "catalog_title_theme_keywords_catalog_title_id_theme_keyword_id_pk" PRIMARY KEY("catalog_title_id","theme_keyword_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"title_type" text NOT NULL,
	"slug" text NOT NULL,
	"display_title" text NOT NULL,
	"original_title" text NOT NULL,
	"tagline" text,
	"synopsis" text,
	"poster_image_path" text,
	"backdrop_image_path" text,
	"trailer_youtube_key" text,
	"trailer_language_code" char(2),
	"release_year" smallint,
	"runtime_minutes" smallint,
	"tmdb_average_rating" numeric(3, 1) NOT NULL,
	"tmdb_vote_count" integer NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_titles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "catalog_titles_tmdb_id_title_type_unique" UNIQUE("tmdb_id","title_type"),
	CONSTRAINT "catalog_titles_title_type_check" CHECK ("catalog_titles"."title_type" in ('movie', 'series'))
);
--> statement-breakpoint
CREATE TABLE "daily_picks" (
	"pick_date" date NOT NULL,
	"kinne_genre" text NOT NULL,
	"catalog_title_id" integer NOT NULL,
	CONSTRAINT "daily_picks_pick_date_kinne_genre_pk" PRIMARY KEY("pick_date","kinne_genre")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"kinne_genre" text,
	CONSTRAINT "genres_tmdb_id_unique" UNIQUE("tmdb_id"),
	CONSTRAINT "genres_kinne_genre_check" CHECK ("genres"."kinne_genre" in ('action', 'comedy', 'drama', 'romance', 'suspense'))
);
--> statement-breakpoint
CREATE TABLE "streaming_availability" (
	"streaming_service_id" integer NOT NULL,
	"catalog_title_id" integer NOT NULL,
	"country_code" char(2) NOT NULL,
	CONSTRAINT "streaming_availability_streaming_service_id_catalog_title_id_country_code_pk" PRIMARY KEY("streaming_service_id","catalog_title_id","country_code")
);
--> statement-breakpoint
CREATE TABLE "streaming_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"logo_image_path" text,
	CONSTRAINT "streaming_services_tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
CREATE TABLE "theme_keywords" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "theme_keywords_tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
ALTER TABLE "anonymous_usage_events" ADD CONSTRAINT "anonymous_usage_events_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_title_genres" ADD CONSTRAINT "catalog_title_genres_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_title_genres" ADD CONSTRAINT "catalog_title_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_title_theme_keywords" ADD CONSTRAINT "catalog_title_theme_keywords_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_title_theme_keywords" ADD CONSTRAINT "catalog_title_theme_keywords_theme_keyword_id_theme_keywords_id_fk" FOREIGN KEY ("theme_keyword_id") REFERENCES "public"."theme_keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_picks" ADD CONSTRAINT "daily_picks_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_availability" ADD CONSTRAINT "streaming_availability_streaming_service_id_streaming_services_id_fk" FOREIGN KEY ("streaming_service_id") REFERENCES "public"."streaming_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaming_availability" ADD CONSTRAINT "streaming_availability_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anonymous_usage_events_occurred_at_idx" ON "anonymous_usage_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "anonymous_usage_events_browser_occurred_at_idx" ON "anonymous_usage_events" USING btree ("anonymous_browser_id","occurred_at");--> statement-breakpoint
CREATE INDEX "catalog_title_genres_genre_title_idx" ON "catalog_title_genres" USING btree ("genre_id","catalog_title_id");--> statement-breakpoint
CREATE INDEX "catalog_title_theme_keywords_keyword_title_idx" ON "catalog_title_theme_keywords" USING btree ("theme_keyword_id","catalog_title_id");--> statement-breakpoint
CREATE INDEX "catalog_titles_title_type_rating_idx" ON "catalog_titles" USING btree ("title_type","tmdb_average_rating");--> statement-breakpoint
CREATE INDEX "catalog_titles_runtime_minutes_idx" ON "catalog_titles" USING btree ("runtime_minutes");--> statement-breakpoint
CREATE INDEX "daily_picks_title_date_idx" ON "daily_picks" USING btree ("catalog_title_id","pick_date");--> statement-breakpoint
CREATE INDEX "streaming_availability_catalog_title_idx" ON "streaming_availability" USING btree ("catalog_title_id");