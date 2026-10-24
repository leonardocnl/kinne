import { sql, type SQL } from "drizzle-orm";

// As chamadas das contas (migration 0011_accounts). Toda escrita é uma função kinne_* que recebe o
// hash do token da sessão: o banco acha a conta lá dentro, e nenhuma delas aceita um id de
// usuário (docs/threats/accounts.md, decisões de 2026-10-24). As leituras são só das tabelas de
// gosto, filtradas pelo id que kinne_session_user devolveu. Sem imports do Next: o teste de ataque
// roda estas instruções contra um Postgres de verdade.

const list = <T>(items: readonly T[], cast: string): SQL =>
    items.length > 0
        ? sql`array[${sql.join(
              items.map((i) => sql`${i}`),
              sql`, `,
          )}]::${sql.raw(cast)}`
        : sql`'{}'::${sql.raw(cast)}`;
const ints = (items: readonly number[]) => list(items, "integer[]");
const texts = (items: readonly string[]) => list(items, "text[]");

export const requestCode = (p: { emailHash: string; codeHash: string }) =>
    sql`select kinne_request_code(${p.emailHash}, ${p.codeHash}) as result`;

export const signIn = (p: {
    emailHash: string;
    email: string;
    codeHash: string;
    tokenHash: string;
    streamings: readonly string[];
    watched: readonly number[];
    liked: readonly number[];
    willWatch: readonly number[];
    disliked: readonly number[];
}) =>
    sql`select kinne_sign_in(${p.emailHash}, ${p.email}, ${p.codeHash}, ${p.tokenHash}, ${texts(p.streamings)}, ${ints(p.watched)}, ${ints(p.liked)}, ${ints(p.willWatch)}, ${ints(p.disliked)}) as result`;

export const sessionUser = (tokenHash: string) =>
    sql`select kinne_session_user(${tokenHash}) as result`;
export const sessionEmail = (tokenHash: string) =>
    sql`select kinne_session_email(${tokenHash}) as result`;
export const signOut = (tokenHash: string) => sql`select kinne_sign_out(${tokenHash}) as result`;
export const signOutAll = (tokenHash: string) =>
    sql`select kinne_sign_out_all(${tokenHash}) as result`;

export const setStreamings = (tokenHash: string, streamings: readonly string[]) =>
    sql`select kinne_set_streamings(${tokenHash}, ${texts(streamings)}) as result`;

export const setSignal = (tokenHash: string, titleId: number, signal: string | null) =>
    sql`select kinne_set_signal(${tokenHash}, ${titleId}, ${signal}) as result`;

export const setWatched = (tokenHash: string, titleId: number, on: boolean) =>
    sql`select kinne_set_watched(${tokenHash}, ${titleId}, ${on}) as result`;

export const onboardingStep = (p: {
    tokenHash: string;
    step: number;
    status: string;
    titleIds: readonly number[];
    streamings: readonly string[];
}) =>
    sql`select kinne_onboarding_step(${p.tokenHash}, ${p.step}, ${p.status}, ${ints(p.titleIds)}, ${texts(p.streamings)}) as result`;

export const requestDeleteCode = (tokenHash: string, codeHash: string) =>
    sql`select kinne_request_delete_code(${tokenHash}, ${codeHash}) as result`;

export const deleteAccount = (tokenHash: string, codeHash: string) =>
    sql`select kinne_delete_account(${tokenHash}, ${codeHash}) as result`;

/**
 * Tudo o que a conta guarda, de uma vez, para o perfil, a exportação e os sorteios. O id é o que
 * kinne_session_user devolveu. Sem e-mail (a coluna não é legível) e sem hashes.
 */
export const loadAccount = (userId: number) => sql`
select jsonb_build_object(
    'createdAt', (select u.created_at from users u where u.id = ${userId}),
    'streamings', coalesce((
        select jsonb_agg(s.streaming order by s.streaming)
        from user_streamings s where s.user_id = ${userId}), '[]'::jsonb),
    'signals', coalesce((
        select jsonb_agg(jsonb_build_object(
            'titleId', t.id, 'slug', t.slug, 'title', t.display_title,
            'year', t.release_year, 'poster', t.poster_image_path,
            'signal', g.signal, 'at', g.updated_at) order by g.updated_at, t.id)
        from user_taste_signals g join catalog_titles t on t.id = g.catalog_title_id
        where g.user_id = ${userId}), '[]'::jsonb),
    'watched', coalesce((
        select jsonb_agg(jsonb_build_object(
            'titleId', t.id, 'slug', t.slug, 'title', t.display_title,
            'year', t.release_year, 'poster', t.poster_image_path,
            'at', w.created_at) order by w.created_at, t.id)
        from user_watched w join catalog_titles t on t.id = w.catalog_title_id
        where w.user_id = ${userId}), '[]'::jsonb),
    'onboarding', coalesce((
        select jsonb_agg(jsonb_build_object('step', o.step, 'status', o.status) order by o.step)
        from user_onboarding o where o.user_id = ${userId}), '[]'::jsonb)
) as result`;

/**
 * O que os sorteios leem da conta (US015 RNE003): só ids, do mais antigo ao mais recente. O id é o
 * que kinne_session_user devolveu.
 */
export const loadTaste = (userId: number) => sql`
select jsonb_build_object(
    'streamings', coalesce((select jsonb_agg(s.streaming order by s.streaming)
        from user_streamings s where s.user_id = ${userId}), '[]'::jsonb),
    'liked', coalesce((select jsonb_agg(g.catalog_title_id order by g.updated_at, g.catalog_title_id)
        from user_taste_signals g where g.user_id = ${userId} and g.signal = 'liked'), '[]'::jsonb),
    'willWatch', coalesce((select jsonb_agg(g.catalog_title_id order by g.updated_at, g.catalog_title_id)
        from user_taste_signals g where g.user_id = ${userId} and g.signal = 'will_watch'), '[]'::jsonb),
    'disliked', coalesce((select jsonb_agg(g.catalog_title_id order by g.updated_at, g.catalog_title_id)
        from user_taste_signals g where g.user_id = ${userId} and g.signal = 'disliked'), '[]'::jsonb),
    'watched', coalesce((select jsonb_agg(w.catalog_title_id order by w.created_at, w.catalog_title_id)
        from user_watched w where w.user_id = ${userId}), '[]'::jsonb)
) as result`;

/** Os ids do catálogo para os slugs que o navegador mandou (o servidor deriva, nunca confia). */
export const titleIdsBySlugs = (slugs: readonly string[]) =>
    sql`select t.id, t.slug from catalog_titles t where t.slug = any(${texts(slugs)})`;
