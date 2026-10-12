CREATE TABLE "circuit_breakers" (
	"name" text PRIMARY KEY NOT NULL,
	"open_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"tokens" double precision NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_cache" (
	"term_hash" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"hits" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "search_cache_status_check" CHECK ("search_cache"."status" in ('pending', 'done'))
);
--> statement-breakpoint
CREATE TABLE "search_counters" (
	"day" date NOT NULL,
	"name" text NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "search_counters_day_name_pk" PRIMARY KEY("day","name")
);
--> statement-breakpoint
ALTER TABLE "anonymous_usage_events" DROP CONSTRAINT "anonymous_usage_events_recommendation_source_check";--> statement-breakpoint
ALTER TABLE "sync_runs" ADD COLUMN "search_cache_rows" integer;--> statement-breakpoint
CREATE INDEX "rate_limit_buckets_updated_at_idx" ON "rate_limit_buckets" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "search_cache_created_at_idx" ON "search_cache" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "anonymous_usage_events" ADD CONSTRAINT "anonymous_usage_events_recommendation_source_check" CHECK ("anonymous_usage_events"."recommendation_source" in ('daily_pick', 'filtered', 'surprise_me', 'search'));