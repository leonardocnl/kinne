CREATE TABLE "meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_person_id" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "people_tmdb_person_id_unique" UNIQUE("tmdb_person_id")
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"target" text NOT NULL,
	"status" text DEFAULT 'failed' NOT NULL,
	"changes_window_start_at" timestamp with time zone,
	"changes_window_end_at" timestamp with time zone,
	"fetched_count" integer DEFAULT 0 NOT NULL,
	"inserted_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"inactivated_count" integer DEFAULT 0 NOT NULL,
	"deleted_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"recommendable_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"active_count" integer DEFAULT 0 NOT NULL,
	"database_size_bytes" bigint,
	"abort_reason" text,
	CONSTRAINT "sync_runs_target_check" CHECK ("sync_runs"."target" in ('develop', 'production')),
	CONSTRAINT "sync_runs_status_check" CHECK ("sync_runs"."status" in ('ok', 'aborted', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "title_credits" (
	"catalog_title_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"role" text NOT NULL,
	"credit_order" smallint NOT NULL,
	CONSTRAINT "title_credits_catalog_title_id_person_id_role_pk" PRIMARY KEY("catalog_title_id","person_id","role"),
	CONSTRAINT "title_credits_role_check" CHECK ("title_credits"."role" in ('director', 'cast'))
);
--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "backdrop_width" integer;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "certification_br" text;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "certification_source" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "is_recommendable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "is_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "title_credits" ADD CONSTRAINT "title_credits_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_credits" ADD CONSTRAINT "title_credits_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_runs_status_started_at_idx" ON "sync_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "title_credits_person_idx" ON "title_credits" USING btree ("person_id");--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD CONSTRAINT "catalog_titles_certification_br_check" CHECK ("catalog_titles"."certification_br" in ('L', '10', '12', '14', '16', '18'));--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD CONSTRAINT "catalog_titles_certification_source_check" CHECK ("catalog_titles"."certification_source" in ('br', 'us', 'none'));