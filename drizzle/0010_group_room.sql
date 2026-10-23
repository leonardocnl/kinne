CREATE TABLE "group_room_finalists" (
	"room_id" integer NOT NULL,
	"round" smallint NOT NULL,
	"catalog_title_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"group_score" real,
	CONSTRAINT "group_room_finalists_room_id_round_catalog_title_id_pk" PRIMARY KEY("room_id","round","catalog_title_id"),
	CONSTRAINT "group_room_finalists_position_unique" UNIQUE("room_id","round","position"),
	CONSTRAINT "group_room_finalists_round_check" CHECK ("group_room_finalists"."round" between 1 and 3),
	CONSTRAINT "group_room_finalists_position_check" CHECK ("group_room_finalists"."position" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "group_room_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_room_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"room_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"token_hash" char(64),
	"ready" boolean DEFAULT false NOT NULL,
	"streamings" text[] DEFAULT '{}' NOT NULL,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"watched_ids" integer[] DEFAULT '{}' NOT NULL,
	"liked_ids" integer[] DEFAULT '{}' NOT NULL,
	"will_watch_ids" integer[] DEFAULT '{}' NOT NULL,
	"disliked_ids" integer[] DEFAULT '{}' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "group_room_members_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "group_room_members_room_position_unique" UNIQUE("room_id","position"),
	CONSTRAINT "group_room_members_room_id_id_unique" UNIQUE("room_id","id"),
	CONSTRAINT "group_room_members_position_check" CHECK ("group_room_members"."position" between 1 and 16),
	CONSTRAINT "group_room_members_streamings_check" CHECK ("group_room_members"."streamings" <@ array['netflix', 'max', 'prime-video', 'disney-plus', 'globoplay']::text[]),
	CONSTRAINT "group_room_members_genres_check" CHECK ("group_room_members"."genres" <@ array['action', 'comedy', 'drama', 'romance', 'suspense']::text[]),
	CONSTRAINT "group_room_members_sizes_check" CHECK (coalesce(cardinality("group_room_members"."watched_ids"), 0) <= 1000
                and coalesce(cardinality("group_room_members"."liked_ids"), 0) <= 200
                and coalesce(cardinality("group_room_members"."will_watch_ids"), 0) <= 200
                and coalesce(cardinality("group_room_members"."disliked_ids"), 0) <= 200),
	CONSTRAINT "group_room_members_left_check" CHECK ("group_room_members"."left_at" is null or "group_room_members"."token_hash" is null)
);
--> statement-breakpoint
CREATE TABLE "group_room_votes" (
	"room_id" integer NOT NULL,
	"round" smallint NOT NULL,
	"member_id" integer NOT NULL,
	"catalog_title_id" integer NOT NULL,
	"approved" boolean NOT NULL,
	CONSTRAINT "group_room_votes_room_id_round_member_id_catalog_title_id_pk" PRIMARY KEY("room_id","round","member_id","catalog_title_id")
);
--> statement-breakpoint
CREATE TABLE "group_rooms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "group_rooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"phase" text DEFAULT 'lobby' NOT NULL,
	"round" smallint DEFAULT 1 NOT NULL,
	"type_choice" text DEFAULT 'both' NOT NULL,
	"max_runtime_minutes" smallint,
	"creator_key_hash" text NOT NULL,
	"creator_member_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"result_at" timestamp with time zone,
	CONSTRAINT "group_rooms_code_unique" UNIQUE("code"),
	CONSTRAINT "group_rooms_code_check" CHECK ("group_rooms"."code" ~ '^[2-9A-HJKMNP-Z]{8}$'),
	CONSTRAINT "group_rooms_phase_check" CHECK ("group_rooms"."phase" in ('lobby', 'voting', 'result')),
	CONSTRAINT "group_rooms_round_check" CHECK ("group_rooms"."round" between 1 and 3),
	CONSTRAINT "group_rooms_type_check" CHECK ("group_rooms"."type_choice" in ('movie', 'series', 'both')),
	CONSTRAINT "group_rooms_runtime_check" CHECK ("group_rooms"."max_runtime_minutes" is null or "group_rooms"."max_runtime_minutes" in (90, 105, 120)),
	CONSTRAINT "group_rooms_expiry_check" CHECK ("group_rooms"."expires_at" > "group_rooms"."created_at")
);
--> statement-breakpoint
ALTER TABLE "group_room_finalists" ADD CONSTRAINT "group_room_finalists_room_id_group_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_room_finalists" ADD CONSTRAINT "group_room_finalists_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_room_members" ADD CONSTRAINT "group_room_members_room_id_group_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_room_votes" ADD CONSTRAINT "group_room_votes_finalist_fk" FOREIGN KEY ("room_id","round","catalog_title_id") REFERENCES "public"."group_room_finalists"("room_id","round","catalog_title_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_room_votes" ADD CONSTRAINT "group_room_votes_member_fk" FOREIGN KEY ("room_id","member_id") REFERENCES "public"."group_room_members"("room_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_rooms_expires_at_idx" ON "group_rooms" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "group_rooms_creator_key_idx" ON "group_rooms" USING btree ("creator_key_hash","created_at");--> statement-breakpoint
-- A sala aponta para quem a criou. A chave é à mão porque as duas tabelas se referenciam: o
-- schema do Drizzle não declara este lado, e a função de criação preenche as duas pontas.
ALTER TABLE "group_rooms" ADD CONSTRAINT "group_rooms_creator_member_id_fk" FOREIGN KEY ("creator_member_id") REFERENCES "public"."group_room_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Funções da sala (docs/threats/group-room.md). O site não escreve direto em salas nem em
-- membros: criar, entrar e sair rodam numa transação só, com os direitos do dono e search_path
-- fixo (como kinne_take_tokens, 0007). O lock da sala serializa quem entra e quem sai ao mesmo
-- tempo (B4, F1); dentro da função cada instrução enxerga o que a anterior gravou.

-- Apaga as salas vencidas e, pelo cascade, tudo o que elas guardam (C2).
CREATE OR REPLACE FUNCTION kinne_purge_group_rooms() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_count integer;
BEGIN
    DELETE FROM group_rooms WHERE expires_at <= now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END
$$;--> statement-breakpoint

-- Cria a sala e põe quem criou nela. Nulo quando a chave já criou 3 salas na última hora (D1).
-- Código repetido levanta unique_violation e quem chama sorteia outro.
CREATE OR REPLACE FUNCTION kinne_create_group_room(
    p_code text, p_creator_key text, p_token_hash text,
    p_streamings text[], p_genres text[],
    p_watched integer[], p_liked integer[], p_will_watch integer[], p_disliked integer[]
) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_room integer;
    v_member integer;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_creator_key, 0));
    PERFORM kinne_purge_group_rooms();
    IF (SELECT count(*) FROM group_rooms
        WHERE creator_key_hash = p_creator_key AND created_at > now() - interval '1 hour') >= 3 THEN
        RETURN NULL;
    END IF;
    INSERT INTO group_rooms (code, creator_key_hash, expires_at)
        VALUES (p_code, p_creator_key, now() + interval '3 hours')
        RETURNING id INTO v_room;
    INSERT INTO group_room_members (
        room_id, position, token_hash, streamings, genres,
        watched_ids, liked_ids, will_watch_ids, disliked_ids)
        VALUES (v_room, 1, p_token_hash, p_streamings, p_genres,
                p_watched, p_liked, p_will_watch, p_disliked)
        RETURNING id INTO v_member;
    UPDATE group_rooms SET creator_member_id = v_member WHERE id = v_room;
    RETURN v_room;
END
$$;--> statement-breakpoint

-- Põe a pessoa na sala. Nulo para código inexistente, vencido, sala cheia (8 pessoas) ou já
-- começada: a mesma resposta nos quatro casos (RNE003, A4).
CREATE OR REPLACE FUNCTION kinne_join_group_room(
    p_code text, p_token_hash text,
    p_streamings text[], p_genres text[],
    p_watched integer[], p_liked integer[], p_will_watch integer[], p_disliked integer[]
) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_room integer;
    v_position integer;
BEGIN
    SELECT id INTO v_room FROM group_rooms
        WHERE code = p_code AND phase = 'lobby' AND expires_at > now()
        FOR UPDATE;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    IF (SELECT count(*) FROM group_room_members WHERE room_id = v_room AND left_at IS NULL) >= 8 THEN
        RETURN NULL;
    END IF;
    SELECT coalesce(max(position), 0) + 1 INTO v_position
        FROM group_room_members WHERE room_id = v_room;
    IF v_position > 16 THEN
        RETURN NULL;
    END IF;
    INSERT INTO group_room_members (
        room_id, position, token_hash, streamings, genres,
        watched_ids, liked_ids, will_watch_ids, disliked_ids)
        VALUES (v_room, v_position, p_token_hash, p_streamings, p_genres,
                p_watched, p_liked, p_will_watch, p_disliked);
    RETURN v_room;
END
$$;--> statement-breakpoint

-- "Sair da sala" (C10, C11). Quem sai perde o cookie e os dados pessoais. Se era quem criou, o
-- papel passa à pessoa mais antiga ainda na sala (menor ordem de entrada); se não sobrou
-- ninguém, a sala expira na hora. Tudo sob o lock da sala: duas saídas ao mesmo tempo dão
-- sempre um resultado válido (F1). Devolve 'left', 'ended' ou nulo (cookie desconhecido).
CREATE OR REPLACE FUNCTION kinne_leave_group_room(p_token_hash text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_room integer;
    v_member integer;
    v_next integer;
BEGIN
    SELECT room_id INTO v_room FROM group_room_members
        WHERE token_hash = p_token_hash AND left_at IS NULL;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    PERFORM 1 FROM group_rooms WHERE id = v_room FOR UPDATE;
    UPDATE group_room_members SET
            left_at = now(), token_hash = NULL, ready = false,
            streamings = '{}', genres = '{}',
            watched_ids = '{}', liked_ids = '{}', will_watch_ids = '{}', disliked_ids = '{}'
        WHERE token_hash = p_token_hash AND left_at IS NULL
        RETURNING id INTO v_member;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    SELECT id INTO v_next FROM group_room_members
        WHERE room_id = v_room AND left_at IS NULL
        ORDER BY position LIMIT 1;
    IF NOT FOUND THEN
        UPDATE group_rooms SET expires_at = greatest(created_at + interval '1 microsecond', least(expires_at, now()))
            WHERE id = v_room;
        RETURN 'ended';
    END IF;
    UPDATE group_rooms SET creator_member_id = v_next
        WHERE id = v_room AND creator_member_id = v_member;
    RETURN 'left';
END
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION kinne_purge_group_rooms() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_create_group_room(text, text, text, text[], text[], integer[], integer[], integer[], integer[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_join_group_room(text, text, text[], text[], integer[], integer[], integer[], integer[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_leave_group_room(text) FROM PUBLIC;--> statement-breakpoint

-- Papéis (group-room A2, B1, C2). kinne_app lê tudo da sala e escreve só o que a fase pede,
-- coluna a coluna; criar, entrar e sair são das funções acima. Nenhum DELETE.
GRANT EXECUTE ON FUNCTION kinne_purge_group_rooms() TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_create_group_room(text, text, text, text[], text[], integer[], integer[], integer[], integer[]) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_join_group_room(text, text, text[], text[], integer[], integer[], integer[], integer[]) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_leave_group_room(text) TO kinne_app;--> statement-breakpoint
GRANT SELECT ON group_rooms, group_room_members, group_room_finalists, group_room_votes TO kinne_app;--> statement-breakpoint
GRANT UPDATE (phase, round, type_choice, max_runtime_minutes, result_at, expires_at) ON group_rooms TO kinne_app;--> statement-breakpoint
GRANT UPDATE (ready, streamings, genres) ON group_room_members TO kinne_app;--> statement-breakpoint
GRANT INSERT ON group_room_finalists TO kinne_app;--> statement-breakpoint
GRANT INSERT ON group_room_votes TO kinne_app;--> statement-breakpoint
GRANT UPDATE (approved) ON group_room_votes TO kinne_app;--> statement-breakpoint
-- Limpeza diária (C2): apagar a sala leva as filhas pelo cascade.
GRANT SELECT, DELETE ON group_rooms TO kinne_sync;
