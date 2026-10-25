-- Grafo de gosto (docs/design/taste-graph.md, docs/threats/taste-graph-data.md).
CREATE TABLE "production_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "production_companies_tmdb_id_unique" UNIQUE("tmdb_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_title_production_companies" (
	"catalog_title_id" integer NOT NULL,
	"production_company_id" integer NOT NULL,
	CONSTRAINT "catalog_title_production_companies_catalog_title_id_production_company_id_pk" PRIMARY KEY("catalog_title_id","production_company_id")
);
--> statement-breakpoint
CREATE TABLE "tmdb_recommendations" (
	"catalog_title_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"recommended_tmdb_id" integer NOT NULL,
	"recommended_title_type" text NOT NULL,
	CONSTRAINT "tmdb_recommendations_catalog_title_id_position_pk" PRIMARY KEY("catalog_title_id","position"),
	CONSTRAINT "tmdb_recommendations_type_check" CHECK ("tmdb_recommendations"."recommended_title_type" in ('movie', 'series')),
	CONSTRAINT "tmdb_recommendations_position_check" CHECK ("tmdb_recommendations"."position" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "title_neighbors" (
	"catalog_title_id" integer NOT NULL,
	"neighbor_title_id" integer NOT NULL,
	"proximity" real NOT NULL,
	"content_score" real NOT NULL,
	"recommendation_score" real NOT NULL,
	CONSTRAINT "title_neighbors_catalog_title_id_neighbor_title_id_pk" PRIMARY KEY("catalog_title_id","neighbor_title_id"),
	CONSTRAINT "title_neighbors_not_self_check" CHECK ("title_neighbors"."catalog_title_id" <> "title_neighbors"."neighbor_title_id"),
	CONSTRAINT "title_neighbors_proximity_check" CHECK ("title_neighbors"."proximity" > 0 and "title_neighbors"."proximity" <= 1)
);
--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "series_type" text;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD COLUMN "collection_tmdb_id" integer;--> statement-breakpoint
ALTER TABLE "catalog_titles" ADD CONSTRAINT "catalog_titles_series_type_check" CHECK ("catalog_titles"."series_type" in ('miniseries', 'scripted', 'documentary', 'reality', 'talk_show', 'news', 'video'));--> statement-breakpoint
ALTER TABLE "title_credits" DROP CONSTRAINT "title_credits_role_check";--> statement-breakpoint
ALTER TABLE "title_credits" ADD CONSTRAINT "title_credits_role_check" CHECK ("title_credits"."role" in ('director', 'cast', 'creator', 'writer'));--> statement-breakpoint
ALTER TABLE "catalog_title_production_companies" ADD CONSTRAINT "catalog_title_production_companies_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_title_production_companies" ADD CONSTRAINT "catalog_title_production_companies_production_company_id_production_companies_id_fk" FOREIGN KEY ("production_company_id") REFERENCES "public"."production_companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tmdb_recommendations" ADD CONSTRAINT "tmdb_recommendations_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_neighbors" ADD CONSTRAINT "title_neighbors_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title_neighbors" ADD CONSTRAINT "title_neighbors_neighbor_title_id_catalog_titles_id_fk" FOREIGN KEY ("neighbor_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Papéis (taste-graph-data B1, B2).
GRANT UPDATE (series_type, collection_tmdb_id) ON catalog_titles TO kinne_sync;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON
    catalog_title_production_companies, tmdb_recommendations, title_neighbors
TO kinne_sync;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE (name) ON production_companies TO kinne_sync;--> statement-breakpoint
GRANT USAGE ON SEQUENCE production_companies_id_seq TO kinne_sync;--> statement-breakpoint
GRANT SELECT ON title_neighbors TO kinne_app;
