CREATE TABLE "sign_in_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sign_in_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"purpose" text NOT NULL,
	"email_hash" char(64),
	"user_id" integer,
	"code_hash" char(64) NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "sign_in_codes_purpose_check" CHECK ("sign_in_codes"."purpose" in ('sign_in', 'delete_account')),
	CONSTRAINT "sign_in_codes_target_check" CHECK (("sign_in_codes"."purpose" = 'sign_in' and "sign_in_codes"."email_hash" is not null and "sign_in_codes"."user_id" is null)
                or ("sign_in_codes"."purpose" = 'delete_account' and "sign_in_codes"."user_id" is not null and "sign_in_codes"."email_hash" is null)),
	CONSTRAINT "sign_in_codes_attempts_check" CHECK ("sign_in_codes"."attempts" between 0 and 5),
	CONSTRAINT "sign_in_codes_expiry_check" CHECK ("sign_in_codes"."expires_at" > "sign_in_codes"."created_at")
);
--> statement-breakpoint
CREATE TABLE "user_onboarding" (
	"user_id" integer NOT NULL,
	"step" smallint NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_onboarding_user_id_step_pk" PRIMARY KEY("user_id","step"),
	CONSTRAINT "user_onboarding_step_check" CHECK ("user_onboarding"."step" between 1 and 3),
	CONSTRAINT "user_onboarding_status_check" CHECK ("user_onboarding"."status" in ('done', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"token_hash" char(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "user_sessions_expiry_check" CHECK ("user_sessions"."expires_at" <= "user_sessions"."absolute_expires_at")
);
--> statement-breakpoint
CREATE TABLE "user_streamings" (
	"user_id" integer NOT NULL,
	"streaming" text NOT NULL,
	CONSTRAINT "user_streamings_user_id_streaming_pk" PRIMARY KEY("user_id","streaming"),
	CONSTRAINT "user_streamings_streaming_check" CHECK ("user_streamings"."streaming" in ('netflix', 'max', 'prime-video', 'disney-plus', 'globoplay'))
);
--> statement-breakpoint
CREATE TABLE "user_taste_signals" (
	"user_id" integer NOT NULL,
	"catalog_title_id" integer NOT NULL,
	"signal" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_taste_signals_user_id_catalog_title_id_pk" PRIMARY KEY("user_id","catalog_title_id"),
	CONSTRAINT "user_taste_signals_signal_check" CHECK ("user_taste_signals"."signal" in ('liked', 'will_watch', 'disliked'))
);
--> statement-breakpoint
CREATE TABLE "user_watched" (
	"user_id" integer NOT NULL,
	"catalog_title_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_watched_user_id_catalog_title_id_pk" PRIMARY KEY("user_id","catalog_title_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_check" CHECK ("users"."email" = lower(btrim("users"."email")) and char_length("users"."email") between 3 and 254
                and "users"."email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
--> statement-breakpoint
ALTER TABLE "sign_in_codes" ADD CONSTRAINT "sign_in_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streamings" ADD CONSTRAINT "user_streamings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_taste_signals" ADD CONSTRAINT "user_taste_signals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_taste_signals" ADD CONSTRAINT "user_taste_signals_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watched" ADD CONSTRAINT "user_watched_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_watched" ADD CONSTRAINT "user_watched_catalog_title_id_catalog_titles_id_fk" FOREIGN KEY ("catalog_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sign_in_codes_live_email_idx" ON "sign_in_codes" USING btree ("email_hash") WHERE "sign_in_codes"."purpose" = 'sign_in' and "sign_in_codes"."used_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sign_in_codes_live_user_idx" ON "sign_in_codes" USING btree ("user_id") WHERE "sign_in_codes"."purpose" = 'delete_account' and "sign_in_codes"."used_at" is null;--> statement-breakpoint
CREATE INDEX "sign_in_codes_expires_at_idx" ON "sign_in_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_taste_signals_recent_idx" ON "user_taste_signals" USING btree ("user_id","signal","updated_at");--> statement-breakpoint
CREATE INDEX "user_watched_recent_idx" ON "user_watched" USING btree ("user_id","created_at");

-- Contas (docs/threats/accounts.md, decisões de 2026-10-24).
-- O site (kinne_app) não toca em sign_in_codes nem em user_sessions, não escreve em tabela de
-- conta nenhuma e não lê users.email. Tudo o que age sobre uma conta é uma função SECURITY DEFINER
-- com search_path fixo que recebe o hash do token da sessão e acha a conta lá dentro
-- (kinne_user_of): nenhuma função tem parâmetro de id de usuário, então só uma sessão válida mexe
-- na própria conta.

-- Interna: a conta dona de uma sessão viva, ou nulo. Ninguém além do dono chama.
CREATE OR REPLACE FUNCTION kinne_user_of(p_token text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
    SELECT user_id FROM public.user_sessions
    WHERE token_hash = p_token AND expires_at > now() AND absolute_expires_at > now()
$$;--> statement-breakpoint

-- Interna: corta cada lista nos mais recentes (200 por sinal, 2000 "Já vi") e as sessões em 10.
CREATE OR REPLACE FUNCTION kinne_trim_user(p_user integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
    DELETE FROM public.user_taste_signals s
    USING (
        SELECT catalog_title_id, signal,
            row_number() OVER (PARTITION BY signal ORDER BY updated_at DESC, catalog_title_id DESC) AS n
        FROM public.user_taste_signals WHERE user_id = p_user
    ) r
    WHERE s.user_id = p_user AND s.catalog_title_id = r.catalog_title_id AND r.n > 200;
    DELETE FROM public.user_watched w
    USING (
        SELECT catalog_title_id,
            row_number() OVER (ORDER BY created_at DESC, catalog_title_id DESC) AS n
        FROM public.user_watched WHERE user_id = p_user
    ) r
    WHERE w.user_id = p_user AND w.catalog_title_id = r.catalog_title_id AND r.n > 2000;
    DELETE FROM public.user_sessions x
    USING (
        SELECT id, row_number() OVER (ORDER BY created_at DESC, id DESC) AS n
        FROM public.user_sessions WHERE user_id = p_user
    ) r
    WHERE x.id = r.id AND r.n > 10;
END
$$;--> statement-breakpoint

-- Interna: junta o que o navegador tinha à conta (US015 RNE002). No conflito do mesmo título o
-- navegador vence; "Já vi" é a união; streamings são os da conta, ou os do navegador se a conta
-- não tem nenhum. Ids que não estão no catálogo são ignorados (B1).
CREATE OR REPLACE FUNCTION kinne_merge_browser(
    p_user integer, p_streamings text[], p_watched integer[],
    p_liked integer[], p_will_watch integer[], p_disliked integer[]
) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_streamings WHERE user_id = p_user) THEN
        INSERT INTO public.user_streamings (user_id, streaming)
            SELECT DISTINCT p_user, s FROM unnest(p_streamings) AS s
            ON CONFLICT DO NOTHING;
    END IF;
    -- do mais antigo ao mais novo: a ordem da lista vira a ordem do tempo, e os do navegador ficam
    -- depois de tudo o que a conta já tinha
    INSERT INTO public.user_watched (user_id, catalog_title_id, created_at)
        SELECT p_user, w.id, now() + w.n * interval '1 microsecond'
        FROM unnest(p_watched) WITH ORDINALITY AS w(id, n)
        WHERE EXISTS (SELECT 1 FROM public.catalog_titles t WHERE t.id = w.id)
        ON CONFLICT DO NOTHING;
    INSERT INTO public.user_taste_signals (user_id, catalog_title_id, signal, updated_at)
        SELECT p_user, x.id, x.signal, now() + x.n * interval '1 microsecond'
        FROM (
            SELECT id, n, 'liked' AS signal FROM unnest(p_liked) WITH ORDINALITY AS a(id, n)
            UNION ALL
            SELECT id, n, 'will_watch' FROM unnest(p_will_watch) WITH ORDINALITY AS b(id, n)
            UNION ALL
            SELECT id, n, 'disliked' FROM unnest(p_disliked) WITH ORDINALITY AS c(id, n)
        ) x
        WHERE EXISTS (SELECT 1 FROM public.catalog_titles t WHERE t.id = x.id)
        ON CONFLICT (user_id, catalog_title_id)
        DO UPDATE SET signal = excluded.signal, updated_at = excluded.updated_at;
    PERFORM public.kinne_trim_user(p_user);
END
$$;--> statement-breakpoint

-- Pede um código de entrar: anula o anterior do mesmo e-mail e grava o novo (RNE002). Os limites de
-- pedido ficam no token bucket, fora daqui.
CREATE OR REPLACE FUNCTION kinne_request_code(p_email_hash text, p_code_hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_email_hash, 1));
    UPDATE public.sign_in_codes SET used_at = now()
        WHERE purpose = 'sign_in' AND email_hash = p_email_hash AND used_at IS NULL;
    INSERT INTO public.sign_in_codes (purpose, email_hash, code_hash, expires_at)
        VALUES ('sign_in', p_email_hash, p_code_hash, now() + interval '10 minutes');
    RETURN true;
END
$$;--> statement-breakpoint

-- Confirma o código e entra (US012 C4, C5). Numa transação só: confere validade e tentativas,
-- marca o uso, abre a conta se for a primeira vez, cria uma sessão nova (nunca reaproveita uma) e
-- leva o que o navegador tinha. Devolve {status: ok | invalid | locked, isNew}.
CREATE OR REPLACE FUNCTION kinne_sign_in(
    p_email_hash text, p_email text, p_code_hash text, p_token_hash text,
    p_streamings text[], p_watched integer[],
    p_liked integer[], p_will_watch integer[], p_disliked integer[]
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_code public.sign_in_codes%ROWTYPE;
    v_user integer;
    v_new boolean := false;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_email_hash, 1));
    SELECT * INTO v_code FROM public.sign_in_codes
        WHERE purpose = 'sign_in' AND email_hash = p_email_hash
            AND used_at IS NULL AND expires_at > now()
        FOR UPDATE;
    IF NOT FOUND THEN
        -- depois do 5º erro o código já não vale: a mensagem pede um novo (RNE004)
        IF EXISTS (
            SELECT 1 FROM public.sign_in_codes
            WHERE purpose = 'sign_in' AND email_hash = p_email_hash
                AND attempts >= 5 AND expires_at > now()
        ) THEN
            RETURN jsonb_build_object('status', 'locked');
        END IF;
        RETURN jsonb_build_object('status', 'invalid');
    END IF;
    IF v_code.code_hash <> p_code_hash THEN
        UPDATE public.sign_in_codes
            SET attempts = attempts + 1,
                used_at = CASE WHEN attempts + 1 >= 5 THEN now() END
            WHERE id = v_code.id;
        RETURN jsonb_build_object(
            'status', CASE WHEN v_code.attempts + 1 >= 5 THEN 'locked' ELSE 'invalid' END);
    END IF;
    -- de uso único: só quem muda used_at de nulo segue (A5)
    UPDATE public.sign_in_codes SET used_at = now() WHERE id = v_code.id AND used_at IS NULL;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'invalid');
    END IF;
    INSERT INTO public.users (email) VALUES (p_email) ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user;
    IF v_user IS NOT NULL THEN
        v_new := true;
    ELSE
        SELECT id INTO v_user FROM public.users WHERE email = p_email;
    END IF;
    INSERT INTO public.user_sessions (user_id, token_hash, expires_at, absolute_expires_at)
        VALUES (v_user, p_token_hash, now() + interval '30 days', now() + interval '90 days');
    PERFORM public.kinne_merge_browser(v_user, p_streamings, p_watched, p_liked, p_will_watch, p_disliked);
    PERFORM public.kinne_trim_user(v_user);
    RETURN jsonb_build_object('status', 'ok', 'isNew', v_new);
END
$$;--> statement-breakpoint

-- A conta da sessão, renovando-a: 30 dias a cada uso, sem passar de 90 desde o login, e no máximo
-- uma escrita por hora (US012 RNE005). Nulo se a sessão não vale.
CREATE OR REPLACE FUNCTION kinne_session_user(p_token text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_session public.user_sessions%ROWTYPE;
BEGIN
    SELECT * INTO v_session FROM public.user_sessions
        WHERE token_hash = p_token AND expires_at > now() AND absolute_expires_at > now();
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    IF v_session.last_used_at < now() - interval '1 hour' THEN
        UPDATE public.user_sessions
            SET last_used_at = now(),
                expires_at = least(now() + interval '30 days', absolute_expires_at)
            WHERE id = v_session.id;
    END IF;
    RETURN v_session.user_id;
END
$$;--> statement-breakpoint

-- O e-mail da conta da sessão, para o perfil e a exportação: o kinne_app não lê users.email.
CREATE OR REPLACE FUNCTION kinne_session_email(p_token text) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
    SELECT u.email FROM public.users u WHERE u.id = public.kinne_user_of(p_token)
$$;--> statement-breakpoint

-- Sair (US012 C7): encerra só esta sessão. Sair de todos os aparelhos: todas as da conta.
CREATE OR REPLACE FUNCTION kinne_sign_out(p_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
    DELETE FROM public.user_sessions WHERE token_hash = p_token;
    RETURN FOUND;
END
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION kinne_sign_out_all(p_token text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
    v_count integer;
BEGIN
    IF v_user IS NULL THEN
        RETURN 0;
    END IF;
    DELETE FROM public.user_sessions WHERE user_id = v_user;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END
$$;--> statement-breakpoint

-- Streamings da conta (US014 C2): troca o conjunto inteiro.
CREATE OR REPLACE FUNCTION kinne_set_streamings(p_token text, p_streamings text[]) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
BEGIN
    IF v_user IS NULL THEN
        RETURN false;
    END IF;
    DELETE FROM public.user_streamings WHERE user_id = v_user;
    INSERT INTO public.user_streamings (user_id, streaming)
        SELECT DISTINCT v_user, s FROM unnest(p_streamings) AS s;
    RETURN true;
END
$$;--> statement-breakpoint

-- Um sinal de gosto (US010, US009, US014 C2): curti, vou assistir ou não curti; nulo tira o título
-- da lista. O título precisa existir no catálogo.
CREATE OR REPLACE FUNCTION kinne_set_signal(p_token text, p_title integer, p_signal text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
BEGIN
    IF v_user IS NULL THEN
        RETURN false;
    END IF;
    IF p_signal IS NULL THEN
        DELETE FROM public.user_taste_signals WHERE user_id = v_user AND catalog_title_id = p_title;
        RETURN true;
    END IF;
    IF p_signal NOT IN ('liked', 'will_watch', 'disliked')
        OR NOT EXISTS (SELECT 1 FROM public.catalog_titles WHERE id = p_title) THEN
        RETURN false;
    END IF;
    INSERT INTO public.user_taste_signals (user_id, catalog_title_id, signal)
        VALUES (v_user, p_title, p_signal)
        ON CONFLICT (user_id, catalog_title_id)
        DO UPDATE SET signal = excluded.signal, updated_at = now();
    PERFORM public.kinne_trim_user(v_user);
    RETURN true;
END
$$;--> statement-breakpoint

-- "Já vi" (US005, US014 C2): marca ou tira.
CREATE OR REPLACE FUNCTION kinne_set_watched(p_token text, p_title integer, p_on boolean) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
BEGIN
    IF v_user IS NULL THEN
        RETURN false;
    END IF;
    IF NOT p_on THEN
        DELETE FROM public.user_watched WHERE user_id = v_user AND catalog_title_id = p_title;
        RETURN true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.catalog_titles WHERE id = p_title) THEN
        RETURN false;
    END IF;
    INSERT INTO public.user_watched (user_id, catalog_title_id) VALUES (v_user, p_title)
        ON CONFLICT DO NOTHING;
    PERFORM public.kinne_trim_user(v_user);
    RETURN true;
END
$$;--> statement-breakpoint

-- Um passo do onboarding (US013 RNE001, RNE002): concluído grava os sinais (3 amados = curti,
-- 3 detestados = não curti) ou os streamings; pulado só registra que foi pulado.
CREATE OR REPLACE FUNCTION kinne_onboarding_step(
    p_token text, p_step integer, p_status text, p_titles integer[], p_streamings text[]
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
    v_ids integer[];
BEGIN
    IF v_user IS NULL OR p_step NOT BETWEEN 1 AND 3 OR p_status NOT IN ('done', 'skipped') THEN
        RETURN false;
    END IF;
    IF p_status = 'done' AND p_step IN (1, 2) THEN
        SELECT array_agg(DISTINCT t.id) INTO v_ids FROM public.catalog_titles t WHERE t.id = ANY(p_titles);
        IF coalesce(cardinality(v_ids), 0) <> 3 OR cardinality(p_titles) <> 3 THEN
            RETURN false;
        END IF;
        INSERT INTO public.user_taste_signals (user_id, catalog_title_id, signal)
            SELECT v_user, id, CASE p_step WHEN 1 THEN 'liked' ELSE 'disliked' END FROM unnest(v_ids) AS id
            ON CONFLICT (user_id, catalog_title_id)
            DO UPDATE SET signal = excluded.signal, updated_at = now();
        PERFORM public.kinne_trim_user(v_user);
    ELSIF p_status = 'done' THEN
        DELETE FROM public.user_streamings WHERE user_id = v_user;
        INSERT INTO public.user_streamings (user_id, streaming)
            SELECT DISTINCT v_user, s FROM unnest(p_streamings) AS s;
    END IF;
    INSERT INTO public.user_onboarding (user_id, step, status) VALUES (v_user, p_step, p_status)
        ON CONFLICT (user_id, step) DO UPDATE SET status = excluded.status, updated_at = now();
    RETURN true;
END
$$;--> statement-breakpoint

-- Código para apagar a conta (US014 C5, B4): só quem tem sessão pede, e ele fica ligado a esta
-- conta; pedir outro anula o anterior.
CREATE OR REPLACE FUNCTION kinne_request_delete_code(p_token text, p_code_hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
BEGIN
    IF v_user IS NULL THEN
        RETURN false;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('delete:' || v_user, 1));
    UPDATE public.sign_in_codes SET used_at = now()
        WHERE purpose = 'delete_account' AND user_id = v_user AND used_at IS NULL;
    INSERT INTO public.sign_in_codes (purpose, user_id, code_hash, expires_at)
        VALUES ('delete_account', v_user, p_code_hash, now() + interval '10 minutes');
    RETURN true;
END
$$;--> statement-breakpoint

-- Apagar a conta (US014 C5, RNE001, RNE002): precisa da sessão e do código novo; apaga a conta e
-- tudo que é dela de uma vez (cascade). Devolve ok, invalid, locked ou no_session.
CREATE OR REPLACE FUNCTION kinne_delete_account(p_token text, p_code_hash text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
    v_code public.sign_in_codes%ROWTYPE;
BEGIN
    IF v_user IS NULL THEN
        RETURN 'no_session';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('delete:' || v_user, 1));
    SELECT * INTO v_code FROM public.sign_in_codes
        WHERE purpose = 'delete_account' AND user_id = v_user
            AND used_at IS NULL AND expires_at > now()
        FOR UPDATE;
    IF NOT FOUND THEN
        IF EXISTS (
            SELECT 1 FROM public.sign_in_codes
            WHERE purpose = 'delete_account' AND user_id = v_user
                AND attempts >= 5 AND expires_at > now()
        ) THEN
            RETURN 'locked';
        END IF;
        RETURN 'invalid';
    END IF;
    IF v_code.code_hash <> p_code_hash THEN
        UPDATE public.sign_in_codes
            SET attempts = attempts + 1,
                used_at = CASE WHEN attempts + 1 >= 5 THEN now() END
            WHERE id = v_code.id;
        RETURN CASE WHEN v_code.attempts + 1 >= 5 THEN 'locked' ELSE 'invalid' END;
    END IF;
    UPDATE public.sign_in_codes SET used_at = now() WHERE id = v_code.id AND used_at IS NULL;
    IF NOT FOUND THEN
        RETURN 'invalid';
    END IF;
    DELETE FROM public.users WHERE id = v_user;
    RETURN 'ok';
END
$$;--> statement-breakpoint

-- Tudo o que a conta guarda, de uma vez, para o perfil e a exportação (sem e-mail e sem hashes).
-- Nulo se o token não é de uma sessão viva.
CREATE OR REPLACE FUNCTION kinne_load_account(p_token text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
BEGIN
    IF v_user IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN jsonb_build_object(
        'createdAt', (SELECT u.created_at FROM public.users u WHERE u.id = v_user),
        'streamings', coalesce((
            SELECT jsonb_agg(s.streaming ORDER BY s.streaming)
            FROM public.user_streamings s WHERE s.user_id = v_user), '[]'::jsonb),
        'signals', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'titleId', t.id, 'slug', t.slug, 'title', t.display_title,
                'year', t.release_year, 'poster', t.poster_image_path,
                'signal', g.signal, 'at', g.updated_at) ORDER BY g.updated_at, t.id)
            FROM public.user_taste_signals g
            JOIN public.catalog_titles t ON t.id = g.catalog_title_id
            WHERE g.user_id = v_user), '[]'::jsonb),
        'watched', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'titleId', t.id, 'slug', t.slug, 'title', t.display_title,
                'year', t.release_year, 'poster', t.poster_image_path,
                'at', w.created_at) ORDER BY w.created_at, t.id)
            FROM public.user_watched w
            JOIN public.catalog_titles t ON t.id = w.catalog_title_id
            WHERE w.user_id = v_user), '[]'::jsonb),
        'onboarding', coalesce((
            SELECT jsonb_agg(jsonb_build_object('step', o.step, 'status', o.status) ORDER BY o.step)
            FROM public.user_onboarding o WHERE o.user_id = v_user), '[]'::jsonb)
    );
END
$$;--> statement-breakpoint

-- O que os sorteios leem da conta (US015 RNE003): só ids, do mais antigo ao mais recente.
CREATE OR REPLACE FUNCTION kinne_load_taste(p_token text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_user integer := public.kinne_user_of(p_token);
BEGIN
    IF v_user IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN jsonb_build_object(
        'streamings', coalesce((SELECT jsonb_agg(s.streaming ORDER BY s.streaming)
            FROM public.user_streamings s WHERE s.user_id = v_user), '[]'::jsonb),
        'liked', coalesce((SELECT jsonb_agg(g.catalog_title_id ORDER BY g.updated_at, g.catalog_title_id)
            FROM public.user_taste_signals g
            WHERE g.user_id = v_user AND g.signal = 'liked'), '[]'::jsonb),
        'willWatch', coalesce((SELECT jsonb_agg(g.catalog_title_id ORDER BY g.updated_at, g.catalog_title_id)
            FROM public.user_taste_signals g
            WHERE g.user_id = v_user AND g.signal = 'will_watch'), '[]'::jsonb),
        'disliked', coalesce((SELECT jsonb_agg(g.catalog_title_id ORDER BY g.updated_at, g.catalog_title_id)
            FROM public.user_taste_signals g
            WHERE g.user_id = v_user AND g.signal = 'disliked'), '[]'::jsonb),
        'watched', coalesce((SELECT jsonb_agg(w.catalog_title_id ORDER BY w.created_at, w.catalog_title_id)
            FROM public.user_watched w WHERE w.user_id = v_user), '[]'::jsonb)
    );
END
$$;--> statement-breakpoint

-- Limpeza diária (D3): sessões vencidas, códigos com mais de um dia. Só o kinne_sync chama.
CREATE OR REPLACE FUNCTION kinne_purge_expired_auth() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    v_sessions integer;
    v_codes integer;
BEGIN
    DELETE FROM public.user_sessions WHERE expires_at <= now() OR absolute_expires_at <= now();
    GET DIAGNOSTICS v_sessions = ROW_COUNT;
    DELETE FROM public.sign_in_codes WHERE created_at < now() - interval '1 day';
    GET DIAGNOSTICS v_codes = ROW_COUNT;
    RETURN v_sessions + v_codes;
END
$$;--> statement-breakpoint

-- Permissões (E2). Todas as funções começam fechadas ao público; só as do site abrem para o
-- kinne_app, e as internas (kinne_user_of, kinne_trim_user, kinne_merge_browser) não abrem para
-- ninguém. A limpeza abre só para o kinne_sync.
REVOKE ALL ON FUNCTION kinne_user_of(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_trim_user(integer) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_merge_browser(integer, text[], integer[], integer[], integer[], integer[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_request_code(text, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_sign_in(text, text, text, text, text[], integer[], integer[], integer[], integer[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_session_user(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_session_email(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_sign_out(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_sign_out_all(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_set_streamings(text, text[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_set_signal(text, integer, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_set_watched(text, integer, boolean) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_onboarding_step(text, integer, text, integer[], text[]) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_request_delete_code(text, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_delete_account(text, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_purge_expired_auth() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_load_account(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION kinne_load_taste(text) FROM PUBLIC;--> statement-breakpoint

GRANT EXECUTE ON FUNCTION kinne_request_code(text, text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_sign_in(text, text, text, text, text[], integer[], integer[], integer[], integer[]) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_session_user(text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_session_email(text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_sign_out(text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_sign_out_all(text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_set_streamings(text, text[]) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_set_signal(text, integer, text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_set_watched(text, integer, boolean) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_onboarding_step(text, integer, text, integer[], text[]) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_request_delete_code(text, text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_delete_account(text, text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_purge_expired_auth() TO kinne_sync;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_load_account(text) TO kinne_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION kinne_load_taste(text) TO kinne_app;--> statement-breakpoint

-- Leitura do site (revisão M4): nenhuma tabela de conta é legível pelo kinne_app, nem as colunas
-- livres de users. O perfil, a exportação e os sorteios leem pelo token da sessão, nas duas funções
-- acima, que acham a conta lá dentro. Um id de usuário nunca atravessa o site.
-- A carga do catálogo mantém inativo o título que alguém referencia (titleReferenced).
GRANT SELECT (catalog_title_id) ON user_taste_signals, user_watched TO kinne_sync;

-- Revisão de segurança do PR #34 (C1): tabela temporária no lugar de tabela real.
-- Sem pg_temp na lista, o Postgres procura primeiro no esquema temporário da sessão, e quem executa
-- SQL como kinne_app (credencial vazada, injeção) cria user_sessions ou sign_in_codes falsas para
-- as funções definer lerem. As funções acima já nascem com pg_catalog, pg_temp e objetos
-- qualificados. As que já estão aplicadas não podem ser reescritas (as migrations aplicadas não
-- mudam): ganham pg_temp por último com ALTER FUNCTION. O corpo delas não qualifica nada, então
-- ficam com public no meio.
ALTER FUNCTION kinne_take_tokens(text[], double precision[], double precision[], text)
    SET search_path = pg_catalog, public, pg_temp;--> statement-breakpoint
ALTER FUNCTION kinne_trip_breaker(text, interval)
    SET search_path = pg_catalog, public, pg_temp;--> statement-breakpoint
-- A sala de grupo (0010_group_room, PR #28) pode ou não estar nesta branch do banco.
DO $$
DECLARE
    f text;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'kinne_purge_group_rooms()',
        'kinne_create_group_room(text, text, text, text[], text[], integer[], integer[], integer[], integer[])',
        'kinne_join_group_room(text, text, text[], text[], integer[], integer[], integer[], integer[])',
        'kinne_leave_group_room(text)'
    ] LOOP
        IF to_regprocedure('public.' || f) IS NOT NULL THEN
            EXECUTE 'ALTER FUNCTION public.' || f || ' SET search_path = pg_catalog, public, pg_temp';
        END IF;
    END LOOP;
END
$$;--> statement-breakpoint

-- Defesa em profundidade: o site nem cria tabela temporária. O banco muda de nome por ambiente,
-- por isso o SQL dinâmico.
DO $$
BEGIN
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM kinne_app', current_database());
END
$$;
