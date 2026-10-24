import { sql, type SQL } from "drizzle-orm";

// As chamadas das contas (migration 0011_accounts). Toda escrita é uma função kinne_* que recebe o
// hash do token da sessão: o banco acha a conta lá dentro, e nenhuma delas aceita um id de
// usuário (docs/threats/accounts.md, decisões de 2026-10-24). As leituras também: o site não lê
// tabela de conta nenhuma, só as funções kinne_load_*. Sem imports do Next: o teste de ataque roda
// estas instruções contra um Postgres de verdade.

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

/** Tudo o que a conta da sessão guarda (perfil, exportação): sem e-mail e sem hashes. */
export const loadAccount = (tokenHash: string) =>
    sql`select kinne_load_account(${tokenHash}) as result`;

/** O que os sorteios leem da conta da sessão: só ids, do mais antigo ao mais recente. */
export const loadTaste = (tokenHash: string) =>
    sql`select kinne_load_taste(${tokenHash}) as result`;

/** Os ids do catálogo para os slugs que o navegador mandou (o servidor deriva, nunca confia). */
export const titleIdsBySlugs = (slugs: readonly string[]) =>
    sql`select t.id, t.slug from catalog_titles t where t.slug = any(${texts(slugs)})`;
