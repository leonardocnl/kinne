import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { mergeBrowserIntoAccount, normalizeEmail, type AccountTaste } from "@/domain/accounts";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
    admin,
    dbTestsEnabled,
    renderSql,
    runAs,
    localDb,
    runAsAsync,
    runScript,
} from "@/test/local-pg";
import { DrizzleCatalogRepository } from "./catalog-repository";
import { titleReferenced } from "./catalog-repository";
import { catalogTitles } from "./schema";
import { codeHash, emailHash, sessionTokenHash } from "../auth/crypto";
import * as q from "./accounts-sql";

// As funções kinne_* contra um PostgreSQL de verdade, com o papel do site (kinne_app): o que o banco
// garante por si, sem passar pelas ações (docs/threats/accounts.md: A1, A5, E2 e o teste de ataque
// 11). Os testes das ações estão em src/app/_actions/account.db.test.ts.

const SECRET = "s".repeat(40);
const app = (statement: ReturnType<typeof sql>) => runAs("kinne_app", statement);
const first = <T = unknown>(rows: Record<string, unknown>[]) => rows[0]?.result as T;

const TITLES = Array.from({ length: 30 }, (_, i) => 9101 + i);

// o hash do cookie de desafio do navegador que pediu o código (M1)
const CHALLENGE = sessionTokenHash("desafio-do-navegador");

const hashes = (
    email: string,
    code: string,
    purpose: "sign_in" | "delete_account" = "sign_in",
) => ({
    emailHash: emailHash(email, SECRET),
    codeHash: codeHash(purpose, email, code, SECRET),
    challengeHash: CHALLENGE,
});

let counter = 0;
const newToken = () => sessionTokenHash(`token-${++counter}-${Date.now()}-${Math.random()}`);

type SignInResult = { status: string; isNew?: boolean };

function signIn(
    email: string,
    code: string,
    tokenHash: string,
    browser: Partial<{
        streamings: string[];
        watched: number[];
        liked: number[];
        willWatch: number[];
        disliked: number[];
    }> = {},
) {
    return first<SignInResult>(
        app(
            q.signIn({
                ...hashes(email, code),
                email,
                tokenHash,
                streamings: browser.streamings ?? [],
                watched: browser.watched ?? [],
                liked: browser.liked ?? [],
                willWatch: browser.willWatch ?? [],
                disliked: browser.disliked ?? [],
            }),
        ),
    );
}

function request(email: string, code: string) {
    app(q.requestCode({ ...hashes(email, code) }));
}

/** Uma conta com sessão pronta: devolve o hash do token. */
function account(email: string, browser: Parameters<typeof signIn>[3] = {}) {
    request(email, "111111");
    const tokenHash = newToken();
    expect(signIn(email, "111111", tokenHash, browser).status).toBe("ok");
    return tokenHash;
}

const userIdOf = (tokenHash: string) => Number(first<number>(app(q.sessionUser(tokenHash))));
const stored = (tokenHash: string) =>
    first<{
        streamings: string[];
        signals: { titleId: number; signal: string }[];
        watched: { titleId: number }[];
        onboarding: { step: number; status: string }[];
    }>(app(q.loadAccount(tokenHash)));

describe.skipIf(!dbTestsEnabled)("funções de conta contra um PostgreSQL de verdade", () => {
    beforeAll(() => {
        for (const id of TITLES) {
            admin(`insert into catalog_titles (id, tmdb_id, title_type, slug, display_title, original_title,
                tmdb_average_rating, tmdb_vote_count, last_synced_at, is_recommendable)
                values (${id}, ${id}, 'movie', 'accounts-test-${id}', 'Título ${id}', 'Title ${id}', 7.5, 1000, now(), true)
                on conflict (id) do nothing`);
        }
    });

    beforeEach(() => {
        admin("delete from users where email like '%@accounts.test'");
        admin("delete from sign_in_codes");
        admin("delete from rate_limit_buckets");
    });

    afterAll(() => {
        admin("delete from users where email like '%@accounts.test'");
        admin("delete from sign_in_codes");
        admin("delete from catalog_titles where id between 9101 and 9130");
    });

    describe("código (A1, A5, US012 RNE002)", () => {
        it("o código certo abre a conta e a sessão; o primeiro acesso é novo, o seguinte não", () => {
            request("ana@accounts.test", "482913");
            const token = newToken();
            expect(signIn("ana@accounts.test", "482913", token)).toEqual({
                status: "ok",
                isNew: true,
            });
            expect(userIdOf(token)).toBeGreaterThan(0);
            request("ana@accounts.test", "555555");
            const second = newToken();
            expect(signIn("ana@accounts.test", "555555", second)).toEqual({
                status: "ok",
                isNew: false,
            });
            expect(userIdOf(second)).toBe(userIdOf(token));
        });

        it("a conta só nasce quando o código é confirmado: pedir não cria usuário", () => {
            request("fantasma@accounts.test", "123456");
            expect(admin("select count(*) from users where email = 'fantasma@accounts.test'")).toBe(
                "0",
            );
        });

        it("o banco guarda o código e o e-mail pendente só como hash", () => {
            request("sigilo@accounts.test", "482913");
            const row = admin("select email_hash || ' ' || code_hash from sign_in_codes");
            expect(row).not.toContain("482913");
            expect(row).not.toContain("sigilo");
            expect(row).toMatch(/^[0-9a-f]{64} [0-9a-f]{64}$/);
        });

        it("5 erros anulam o código; o 6º erro e o código certo falham (ataque 1, A1)", () => {
            request("forca@accounts.test", "482913");
            const statuses = Array.from(
                { length: 5 },
                (_, i) => signIn("forca@accounts.test", `00000${i}`, newToken()).status,
            );
            expect(statuses).toEqual(["invalid", "invalid", "invalid", "invalid", "locked"]);
            expect(signIn("forca@accounts.test", "000009", newToken()).status).toBe("locked");
            expect(signIn("forca@accounts.test", "482913", newToken()).status).toBe("locked");
            expect(admin("select count(*) from users where email = 'forca@accounts.test'")).toBe(
                "0",
            );
        });

        it("o código de uso único não vale uma segunda vez (ataque 2, A5)", () => {
            request("replay@accounts.test", "482913");
            expect(signIn("replay@accounts.test", "482913", newToken()).status).toBe("ok");
            expect(signIn("replay@accounts.test", "482913", newToken()).status).toBe("invalid");
        });

        it("um código emitido para A não vale com o e-mail B (ataque 3, A5)", () => {
            request("a@accounts.test", "482913");
            request("b@accounts.test", "999999");
            // o hash do código leva o e-mail: o código de A com o e-mail de B não confere
            const crossed = first<SignInResult>(
                app(
                    q.signIn({
                        emailHash: emailHash("b@accounts.test", SECRET),
                        email: "b@accounts.test",
                        codeHash: codeHash("sign_in", "a@accounts.test", "482913", SECRET),
                        challengeHash: CHALLENGE,
                        tokenHash: newToken(),
                        streamings: [],
                        watched: [],
                        liked: [],
                        willWatch: [],
                        disliked: [],
                    }),
                ),
            );
            expect(crossed.status).not.toBe("ok");
            // e o código de A continua valendo só para A
            expect(signIn("a@accounts.test", "482913", newToken()).status).toBe("ok");
        });

        it("o hash do código muda com a finalidade, o e-mail e o código", () => {
            const base = codeHash("sign_in", "a@accounts.test", "482913", SECRET);
            expect(codeHash("delete_account", "a@accounts.test", "482913", SECRET)).not.toBe(base);
            expect(codeHash("sign_in", "b@accounts.test", "482913", SECRET)).not.toBe(base);
            expect(codeHash("sign_in", "a@accounts.test", "482914", SECRET)).not.toBe(base);
            expect(codeHash("sign_in", "a@accounts.test", "482913", "t".repeat(40))).not.toBe(base);
        });

        it("um código vencido não vale, com a mesma resposta de um errado", () => {
            request("lento@accounts.test", "482913");
            admin(
                "update sign_in_codes set created_at = now() - interval '11 minutes', expires_at = now() - interval '1 minute'",
            );
            expect(signIn("lento@accounts.test", "482913", newToken()).status).toBe("invalid");
        });

        it("pedir outro código anula o anterior (RNE002)", () => {
            request("dois@accounts.test", "111111");
            request("dois@accounts.test", "222222");
            expect(signIn("dois@accounts.test", "111111", newToken()).status).toBe("invalid");
            expect(signIn("dois@accounts.test", "222222", newToken()).status).toBe("ok");
        });

        it("sem pedido nenhum, qualquer código é inválido", () => {
            expect(signIn("nunca@accounts.test", "123456", newToken()).status).toBe("invalid");
        });

        it("duas confirmações ao mesmo tempo do mesmo código: só uma passa (A5)", () => {
            request("corrida@accounts.test", "482913");
            const results = Array.from(
                { length: 2 },
                () => signIn("corrida@accounts.test", "482913", newToken()).status,
            );
            expect(results.filter((s) => s === "ok")).toHaveLength(1);
        });
    });

    describe("sessão (A2, US012 RNE005)", () => {
        it("o banco guarda só o hash do token, e a sessão vale por 30 dias com teto de 90", () => {
            const token = account("sessao@accounts.test");
            const row = admin(
                `select extract(day from expires_at - created_at)::int || ' ' || extract(day from absolute_expires_at - created_at)::int from user_sessions where token_hash = '${token}'`,
            );
            expect(row).toBe("30 90");
            expect(admin("select count(*) from user_sessions where token_hash <> ''")).toBe("1");
        });

        it("uma sessão desconhecida, de outro tamanho ou em maiúsculas não vale", () => {
            const token = account("formato@accounts.test");
            for (const bad of [token.toUpperCase(), token.slice(1), `${token}0`, "", " " + token]) {
                expect(first(app(q.sessionUser(bad)))).toBeNull();
            }
            expect(first(app(q.sessionUser(token)))).not.toBeNull();
        });

        it("renova no máximo uma vez por hora, sem passar do teto", () => {
            const token = account("renova@accounts.test");
            const expiry = () =>
                admin(
                    `select extract(epoch from expires_at)::bigint from user_sessions where token_hash = '${token}'`,
                );
            const before = expiry();
            app(q.sessionUser(token));
            expect(expiry()).toBe(before);
            admin(
                `update user_sessions set last_used_at = now() - interval '2 hours', expires_at = now() + interval '10 days' where token_hash = '${token}'`,
            );
            app(q.sessionUser(token));
            expect(Number(expiry())).toBeGreaterThan(Number(before) - 5);
            // perto do teto: 85 dias depois do login, o fim fica no teto de 90
            admin(
                `update user_sessions set created_at = now() - interval '85 days', absolute_expires_at = now() + interval '5 days', last_used_at = now() - interval '2 hours', expires_at = now() + interval '1 day' where token_hash = '${token}'`,
            );
            app(q.sessionUser(token));
            expect(
                admin(
                    `select expires_at = absolute_expires_at from user_sessions where token_hash = '${token}'`,
                ),
            ).toBe("t");
        });

        it("a sessão vencida, ou além do teto, não vale", () => {
            const token = account("vencida@accounts.test");
            admin(
                `update user_sessions set expires_at = now() - interval '1 second' where token_hash = '${token}'`,
            );
            expect(first(app(q.sessionUser(token)))).toBeNull();
            const other = account("teto@accounts.test");
            admin(
                `update user_sessions set absolute_expires_at = now() - interval '1 second', expires_at = now() - interval '1 second' where token_hash = '${other}'`,
            );
            expect(first(app(q.sessionUser(other)))).toBeNull();
        });

        it("cada entrada é uma sessão nova; uma conta guarda no máximo 10", () => {
            const email = "muitas@accounts.test";
            const tokens: string[] = [];
            for (let i = 0; i < 12; i++) {
                request(email, "111111");
                const token = newToken();
                expect(signIn(email, "111111", token).status).toBe("ok");
                tokens.push(token);
            }
            expect(
                admin(
                    "select count(*) from user_sessions where user_id = (select id from users where email = 'muitas@accounts.test')",
                ),
            ).toBe("10");
            // as duas primeiras saíram; as outras seguem
            expect(first(app(q.sessionUser(tokens[0])))).toBeNull();
            expect(first(app(q.sessionUser(tokens[1])))).toBeNull();
            expect(first(app(q.sessionUser(tokens[11])))).not.toBeNull();
        });

        it("sair encerra só esta sessão; sair de todos encerra todas (ataque 9)", () => {
            const email = "sair@accounts.test";
            const one = account(email);
            request(email, "222222");
            const two = newToken();
            signIn(email, "222222", two);
            expect(first(app(q.signOut(one)))).toBe(true);
            expect(first(app(q.sessionUser(one)))).toBeNull();
            expect(first(app(q.sessionUser(two)))).not.toBeNull();
            request(email, "333333");
            const three = newToken();
            signIn(email, "333333", three);
            expect(Number(first(app(q.signOutAll(two))))).toBe(2);
            expect(first(app(q.sessionUser(two)))).toBeNull();
            expect(first(app(q.sessionUser(three)))).toBeNull();
        });
    });

    describe("juntar o navegador à conta (US015 RNE002)", () => {
        it("no conflito do mesmo título o navegador vence; Já vi é a união; streamings da conta", () => {
            const email = "juntar@accounts.test";
            const token = account(email, {
                streamings: ["netflix"],
                watched: [9101, 9102],
                liked: [9101, 9102],
                willWatch: [9103],
                disliked: [9104],
            });
            request(email, "222222");
            const again = newToken();
            signIn(email, "222222", again, {
                streamings: ["max"],
                watched: [9102, 9105],
                liked: [9104],
                willWatch: [],
                disliked: [9101],
            });
            const data = stored(token);
            const of = (signal: string) =>
                data.signals
                    .filter((s) => s.signal === signal)
                    .map((s) => s.titleId)
                    .sort();
            expect(of("liked")).toEqual([9102, 9104]);
            expect(of("will_watch")).toEqual([9103]);
            expect(of("disliked")).toEqual([9101]);
            expect(data.watched.map((w) => w.titleId).sort()).toEqual([9101, 9102, 9105]);
            expect(data.streamings).toEqual(["netflix"]);
        });

        it("a conta sem streamings fica com os do navegador", () => {
            const token = account("sem-stream@accounts.test", { streamings: ["max", "globoplay"] });
            expect(stored(token).streamings).toEqual(["globoplay", "max"]);
        });

        it("ids que não estão no catálogo são ignorados (B1)", () => {
            const token = account("ids@accounts.test", {
                watched: [9101, 99999999],
                liked: [88888888, 9102],
            });
            const data = stored(token);
            expect(data.watched.map((w) => w.titleId)).toEqual([9101]);
            expect(data.signals.map((s) => s.titleId)).toEqual([9102]);
        });

        it("o SQL dá o mesmo resultado que mergeBrowserIntoAccount", () => {
            const cases: { account: AccountTaste; browser: AccountTaste }[] = [
                {
                    account: {
                        streamings: ["netflix"],
                        signals: { liked: [9101, 9102, 9103], willWatch: [9104], disliked: [9105] },
                        watched: [9101, 9102],
                    },
                    browser: {
                        streamings: ["max"],
                        signals: { liked: [9105], willWatch: [9101], disliked: [9106, 9102] },
                        watched: [9102, 9107],
                    },
                },
                {
                    account: {
                        streamings: [],
                        signals: { liked: [], willWatch: [], disliked: [] },
                        watched: [],
                    },
                    browser: {
                        streamings: ["disney-plus"],
                        signals: { liked: [9101, 9102], willWatch: [], disliked: [9103] },
                        watched: [9104],
                    },
                },
                {
                    account: {
                        streamings: ["globoplay"],
                        signals: { liked: [9110], willWatch: [], disliked: [] },
                        watched: [9110],
                    },
                    browser: {
                        streamings: [],
                        signals: { liked: [], willWatch: [], disliked: [] },
                        watched: [],
                    },
                },
            ];
            cases.forEach((c, i) => {
                const email = `merge${i}@accounts.test`;
                // 1ª entrada: leva os dados da conta; 2ª: leva os do navegador
                const token = account(email, {
                    streamings: c.account.streamings,
                    watched: c.account.watched,
                    liked: c.account.signals.liked,
                    willWatch: c.account.signals.willWatch,
                    disliked: c.account.signals.disliked,
                });
                request(email, "222222");
                signIn(email, "222222", newToken(), {
                    streamings: c.browser.streamings,
                    watched: c.browser.watched,
                    liked: c.browser.signals.liked,
                    willWatch: c.browser.signals.willWatch,
                    disliked: c.browser.signals.disliked,
                });
                const data = stored(token);
                const expected = mergeBrowserIntoAccount(c.account, c.browser);
                const ids = (signal: string) =>
                    data.signals.filter((s) => s.signal === signal).map((s) => s.titleId);
                expect(ids("liked")).toEqual(expected.signals.liked);
                expect(ids("will_watch")).toEqual(expected.signals.willWatch);
                expect(ids("disliked")).toEqual(expected.signals.disliked);
                expect(data.watched.map((w) => w.titleId)).toEqual(expected.watched);
                expect([...data.streamings].sort()).toEqual([...expected.streamings].sort());
            });
        });

        it("cada lista guarda os 200 mais recentes e 'Já vi' os 2000", () => {
            const token = account("limites@accounts.test");
            const user = userIdOf(token);
            admin(`insert into catalog_titles (id, tmdb_id, title_type, slug, display_title, original_title,
                tmdb_average_rating, tmdb_vote_count, last_synced_at, is_recommendable)
                select 20000 + n, 20000 + n, 'movie', 'accounts-bulk-' || n, 't', 't', 7, 1000, now(), true
                from generate_series(1, 2100) n on conflict do nothing`);
            admin(`insert into user_taste_signals (user_id, catalog_title_id, signal, updated_at)
                select ${user}, 20000 + n, 'liked', now() - (2100 - n) * interval '1 second' from generate_series(1, 250) n`);
            admin(`insert into user_watched (user_id, catalog_title_id, created_at)
                select ${user}, 20000 + n, now() - (2100 - n) * interval '1 second' from generate_series(1, 2100) n`);
            expect(first(app(q.setSignal(token, 9101, "liked")))).toBe(true);
            expect(first(app(q.setWatched(token, 9101, true)))).toBe(true);
            expect(
                admin(
                    `select count(*) from user_taste_signals where user_id = ${user} and signal = 'liked'`,
                ),
            ).toBe("200");
            expect(admin(`select count(*) from user_watched where user_id = ${user}`)).toBe("2000");
            // ficam os mais recentes, e o recém-marcado está entre eles
            expect(
                admin(
                    `select count(*) from user_taste_signals where user_id = ${user} and catalog_title_id = 9101`,
                ),
            ).toBe("1");
            expect(
                admin(
                    `select count(*) from user_taste_signals where user_id = ${user} and catalog_title_id = 20001`,
                ),
            ).toBe("0");
            admin("delete from users where email = 'limites@accounts.test'");
            admin("delete from catalog_titles where id > 20000 and id <= 22100");
        });
    });

    describe("o que a conta muda (US014 C2, US013)", () => {
        it("sinal, já vi, streamings e onboarding gravam na conta da sessão", () => {
            const token = account("muda@accounts.test");
            expect(first(app(q.setSignal(token, 9101, "liked")))).toBe(true);
            expect(first(app(q.setSignal(token, 9102, "disliked")))).toBe(true);
            expect(first(app(q.setSignal(token, 9101, "disliked")))).toBe(true);
            expect(first(app(q.setSignal(token, 9102, null)))).toBe(true);
            expect(first(app(q.setWatched(token, 9103, true)))).toBe(true);
            expect(first(app(q.setStreamings(token, ["max", "netflix"])))).toBe(true);
            const data = stored(token);
            expect(data.signals).toMatchObject([{ titleId: 9101, signal: "disliked" }]);
            expect(data.watched.map((w) => w.titleId)).toEqual([9103]);
            expect(data.streamings).toEqual(["max", "netflix"]);
        });

        it("recusa sinal inválido e título que não existe", () => {
            const token = account("invalido@accounts.test");
            expect(first(app(q.setSignal(token, 9101, "adorei")))).toBe(false);
            expect(first(app(q.setSignal(token, 123456789, "liked")))).toBe(false);
            expect(first(app(q.setWatched(token, 123456789, true)))).toBe(false);
        });

        it("onboarding: concluir grava 3 sinais; pular só registra; o que falta é o primeiro sem linha", () => {
            const token = account("onboard@accounts.test");
            const step = (
                n: number,
                status: string,
                titles: number[] = [],
                streamings: string[] = [],
            ) =>
                first(
                    app(
                        q.onboardingStep({
                            tokenHash: token,
                            step: n,
                            status,
                            titleIds: titles,
                            streamings,
                        }),
                    ),
                );
            expect(step(1, "done", [9101, 9102])).toBe(false);
            expect(step(1, "done", [9101, 9102, 9102])).toBe(false);
            expect(step(1, "done", [9101, 9102, 99999999])).toBe(false);
            expect(stored(token).onboarding).toEqual([]);
            expect(step(1, "done", [9101, 9102, 9103])).toBe(true);
            expect(step(2, "skipped")).toBe(true);
            expect(step(3, "done", [], ["globoplay"])).toBe(true);
            const data = stored(token);
            expect(data.signals.map((s) => [s.titleId, s.signal]).sort()).toEqual([
                [9101, "liked"],
                [9102, "liked"],
                [9103, "liked"],
            ]);
            expect(data.onboarding).toEqual([
                { step: 1, status: "done" },
                { step: 2, status: "skipped" },
                { step: 3, status: "done" },
            ]);
            expect(data.streamings).toEqual(["globoplay"]);
            expect(step(4, "done")).toBe(false);
            expect(step(1, "feito")).toBe(false);
        });
    });

    describe("apagar a conta (US014 C5, ataque 8)", () => {
        it("com a sessão e sem o código novo, nada é apagado", () => {
            const token = account("apagar@accounts.test", { liked: [9101] });
            expect(
                first(
                    app(
                        q.deleteAccount(
                            token,
                            codeHash("delete_account", "apagar@accounts.test", "123456", SECRET),
                        ),
                    ),
                ),
            ).toBe("invalid");
            expect(admin("select count(*) from users where email = 'apagar@accounts.test'")).toBe(
                "1",
            );
        });

        it("o código de entrar não apaga a conta, e o de apagar não entra", () => {
            const email = "troca@accounts.test";
            const token = account(email);
            expect(
                first(
                    app(
                        q.requestDeleteCode(
                            token,
                            codeHash("delete_account", email, "654321", SECRET),
                        ),
                    ),
                ),
            ).toBe(true);
            // o hash do código de entrar, usado para apagar, não confere
            expect(
                first(app(q.deleteAccount(token, codeHash("sign_in", email, "654321", SECRET)))),
            ).toBe("invalid");
            // o código de apagar não serve para entrar
            expect(signIn(email, "654321", newToken()).status).not.toBe("ok");
            expect(admin(`select count(*) from users where email = '${email}'`)).toBe("1");
        });

        it("com o código novo apaga a conta e tudo que é dela, numa transação", () => {
            const email = "tchau@accounts.test";
            const token = account(email, { liked: [9101], watched: [9102], streamings: ["max"] });
            const user = userIdOf(token);
            app(
                q.onboardingStep({
                    tokenHash: token,
                    step: 2,
                    status: "skipped",
                    titleIds: [],
                    streamings: [],
                }),
            );
            expect(
                first(
                    app(
                        q.requestDeleteCode(
                            token,
                            codeHash("delete_account", email, "654321", SECRET),
                        ),
                    ),
                ),
            ).toBe(true);
            expect(
                first(
                    app(
                        q.deleteAccount(token, codeHash("delete_account", email, "654321", SECRET)),
                    ),
                ),
            ).toBe("ok");
            for (const table of [
                "users",
                "user_sessions",
                "user_taste_signals",
                "user_watched",
                "user_streamings",
                "user_onboarding",
            ]) {
                const column = table === "users" ? "id" : "user_id";
                expect(admin(`select count(*) from ${table} where ${column} = ${user}`)).toBe("0");
            }
            expect(first(app(q.sessionUser(token)))).toBeNull();
        });

        it("5 erros anulam o código de apagar", () => {
            const email = "forca-del@accounts.test";
            const token = account(email);
            app(q.requestDeleteCode(token, codeHash("delete_account", email, "654321", SECRET)));
            const results = Array.from({ length: 5 }, (_, i) =>
                first(
                    app(
                        q.deleteAccount(
                            token,
                            codeHash("delete_account", email, `00000${i}`, SECRET),
                        ),
                    ),
                ),
            );
            expect(results).toEqual(["invalid", "invalid", "invalid", "invalid", "locked"]);
            expect(
                first(
                    app(
                        q.deleteAccount(token, codeHash("delete_account", email, "654321", SECRET)),
                    ),
                ),
            ).toBe("locked");
            expect(admin(`select count(*) from users where email = '${email}'`)).toBe("1");
        });

        it("quem não tem sessão não pede nem usa o código", () => {
            expect(first(app(q.requestDeleteCode(newToken(), "a".repeat(64))))).toBe(false);
            expect(first(app(q.deleteAccount(newToken(), "a".repeat(64))))).toBe("no_session");
        });
    });

    describe("uma conta não age sobre outra (ataque 11, A4, E2)", () => {
        it("nenhuma função do site recebe um id de usuário", () => {
            const rows = admin(`
                select string_agg(p.proname || '(' || pg_get_function_arguments(p.oid) || ')', E'\\n')
                from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.proname like 'kinne\\_%'
                    and has_function_privilege('kinne_app', p.oid, 'EXECUTE')`);
            const functions = rows.split("\n");
            for (const f of [
                "kinne_sign_in",
                "kinne_session_user",
                "kinne_set_signal",
                "kinne_delete_account",
                "kinne_onboarding_step",
            ]) {
                expect(
                    functions.some((line) => line.startsWith(`${f}(`)),
                    f,
                ).toBe(true);
            }
            for (const line of functions) {
                expect(line, line).not.toMatch(/user_?id|\bp_user\b|\buser\b/i);
            }
            // as internas, que recebem p_user, não são do site
            for (const internal of [
                "kinne_user_of",
                "kinne_trim_user",
                "kinne_merge_browser",
                "kinne_purge_expired_auth",
            ]) {
                expect(
                    functions.some((line) => line.startsWith(`${internal}(`)),
                    internal,
                ).toBe(false);
            }
        });

        it("com o token de A, nenhuma função com argumentos de B muda B", () => {
            const a = account("a-ataque@accounts.test", { liked: [9101] });
            const bEmail = "b-ataque@accounts.test";
            const b = account(bEmail, {
                liked: [9110, 9111],
                disliked: [9112],
                watched: [9113],
                streamings: ["globoplay"],
            });
            const bUser = userIdOf(b);
            admin(
                `insert into user_onboarding (user_id, step, status) values (${bUser}, 1, 'done')`,
            );
            // B pediu um código para apagar a conta; o ataque tenta gastá-lo com a sessão de A
            const bDeleteCode = codeHash("delete_account", bEmail, "654321", SECRET);
            expect(first(app(q.requestDeleteCode(b, bDeleteCode)))).toBe(true);

            const snapshot = () =>
                JSON.stringify({
                    data: stored(b),
                    sessions: admin(`select count(*) from user_sessions where user_id = ${bUser}`),
                    deleteCode: admin(
                        `select attempts || ' ' || coalesce(used_at::text, 'vivo') from sign_in_codes where user_id = ${bUser}`,
                    ),
                    email: admin(`select email from users where id = ${bUser}`),
                });
            const before = snapshot();

            // todas as funções do site, com o token de A e os títulos, o código e o e-mail de B
            expect(first(app(q.setSignal(a, 9110, null)))).toBe(true);
            expect(first(app(q.setSignal(a, 9112, "liked")))).toBe(true);
            expect(first(app(q.setWatched(a, 9113, false)))).toBe(true);
            expect(first(app(q.setStreamings(a, ["netflix"])))).toBe(true);
            expect(
                first(
                    app(
                        q.onboardingStep({
                            tokenHash: a,
                            step: 1,
                            status: "skipped",
                            titleIds: [],
                            streamings: [],
                        }),
                    ),
                ),
            ).toBe(true);
            expect(first(app(q.deleteAccount(a, bDeleteCode)))).toBe("invalid");
            expect(first(app(q.sessionEmail(a)))).toBe("a-ataque@accounts.test");
            // pedir o código de apagar de A e usar com o hash do código de B também não vale
            expect(
                first(
                    app(
                        q.requestDeleteCode(
                            a,
                            codeHash("delete_account", "a-ataque@accounts.test", "111222", SECRET),
                        ),
                    ),
                ),
            ).toBe(true);
            expect(first(app(q.deleteAccount(a, bDeleteCode)))).toBe("invalid");
            expect(first(app(q.signOutAll(a)))).toBe(1);
            expect(first(app(q.sessionUser(a)))).toBeNull();

            expect(snapshot()).toBe(before);
            expect(first(app(q.sessionUser(b)))).toBe(bUser);
            // o que o ataque podia mudar de verdade, a conta de A, mudou só nela
            expect(admin("select count(*) from users where email = 'a-ataque@accounts.test'")).toBe(
                "1",
            );
        });

        it("token vazio, nulo ou com cara de injeção não age sobre ninguém", () => {
            const token = account("alvo@accounts.test", { liked: [9101] });
            const user = userIdOf(token);
            const before = JSON.stringify(stored(token));
            for (const bad of [
                "",
                "' or '1'='1",
                `${token}' --`,
                "%",
                "0".repeat(64),
                "A".repeat(64),
            ]) {
                expect(first(app(q.setSignal(bad, 9101, null)))).toBe(false);
                expect(first(app(q.setWatched(bad, 9102, true)))).toBe(false);
                expect(first(app(q.setStreamings(bad, ["max"])))).toBe(false);
                expect(first(app(q.signOutAll(bad)))).toBe(0);
                expect(first(app(q.signOut(bad)))).toBe(false);
                expect(first(app(q.sessionEmail(bad)))).toBeNull();
                expect(first(app(q.requestDeleteCode(bad, "a".repeat(64))))).toBe(false);
                expect(first(app(q.deleteAccount(bad, "a".repeat(64))))).toBe("no_session");
                expect(
                    first(
                        app(
                            q.onboardingStep({
                                tokenHash: bad,
                                step: 1,
                                status: "skipped",
                                titleIds: [],
                                streamings: [],
                            }),
                        ),
                    ),
                ).toBe(false);
            }
            // sem token (nulo), as funções recusam do mesmo jeito
            expect(
                first(runAs("kinne_app", sql`select kinne_set_signal(null, 9101, null) as result`)),
            ).toBe(false);
            expect(JSON.stringify(stored(token))).toBe(before);
            expect(first(app(q.sessionUser(token)))).toBe(user);
        });
    });

    describe("permissões do banco (E2, C6)", () => {
        const denied = (role: string, statement: string) => {
            expect(() => runAs(role, sql.raw(statement)), statement).toThrow();
        };

        it("o site não lê o e-mail, os códigos nem as sessões, e não escreve em tabela de conta", () => {
            denied("kinne_app", "select email from users");
            denied("kinne_app", "select * from users");
            denied("kinne_app", "select * from sign_in_codes");
            denied("kinne_app", "select * from user_sessions");
            denied("kinne_app", "select token_hash from user_sessions");
            for (const table of [
                "users",
                "sign_in_codes",
                "user_sessions",
                "user_streamings",
                "user_taste_signals",
                "user_watched",
                "user_onboarding",
            ]) {
                denied("kinne_app", `delete from ${table}`);
                denied("kinne_app", `update ${table} set user_id = user_id where false`);
            }
            denied("kinne_app", "insert into users (email) values ('x@y.zz')");
            denied(
                "kinne_app",
                "insert into user_taste_signals (user_id, catalog_title_id, signal) values (1, 9101, 'liked')",
            );
            denied(
                "kinne_app",
                "insert into user_watched (user_id, catalog_title_id) values (1, 9101)",
            );
            denied(
                "kinne_app",
                "insert into user_sessions (user_id, token_hash, expires_at, absolute_expires_at) values (1, 'x', now(), now())",
            );
        });

        it("o site não lê direto nenhuma tabela de conta, nem as colunas livres de users (M4)", () => {
            const token = account("leitura@accounts.test", { liked: [9101] });
            const user = userIdOf(token);
            for (const table of [
                "user_streamings",
                "user_taste_signals",
                "user_watched",
                "user_onboarding",
            ]) {
                denied("kinne_app", `select * from ${table} where user_id = ${user}`);
                denied("kinne_app", `select user_id from ${table}`);
            }
            denied("kinne_app", `select id, created_at from users where id = ${user}`);
            denied("kinne_app", "select id from users");
            denied("kinne_app", "select count(*) from users");
        });

        it("kinne_load_account e kinne_load_taste devolvem só a conta do token (M4)", () => {
            const a = account("le-a@accounts.test", { liked: [9101], watched: [9102] });
            const b = account("le-b@accounts.test", { disliked: [9103], streamings: ["max"] });
            const dataA = stored(a);
            const dataB = stored(b);
            expect(dataA.signals.map((s) => s.titleId)).toEqual([9101]);
            expect(dataA.watched.map((w) => w.titleId)).toEqual([9102]);
            expect(dataB.signals.map((s) => s.titleId)).toEqual([9103]);
            expect(dataB.streamings).toEqual(["max"]);
            expect(
                first<{ liked: number[]; watched: number[] }>(app(q.loadTaste(a))),
            ).toMatchObject({ liked: [9101], watched: [9102] });
            expect(first<{ disliked: number[] }>(app(q.loadTaste(b))).disliked).toEqual([9103]);
            for (const token of ["", "x", "f".repeat(64), a.toUpperCase(), `${a}' or '1'='1`]) {
                expect(first(app(q.loadAccount(token))), token).toBeNull();
                expect(first(app(q.loadTaste(token))), token).toBeNull();
            }
            admin(
                `update user_sessions set expires_at = now() - interval '1 second' where token_hash = '${a}'`,
            );
            expect(first(app(q.loadAccount(a)))).toBeNull();
            expect(first(app(q.loadTaste(a)))).toBeNull();
        });

        it("o kinne_app não tem CREATE no esquema public, nem herdado de PUBLIC", () => {
            expect(admin("select has_schema_privilege('kinne_app', 'public', 'CREATE')")).toBe("f");
            expect(
                admin(
                    `select count(*) from pg_namespace n, aclexplode(n.nspacl) a
                     where n.nspname = 'public' and a.grantee = 0 and a.privilege_type = 'CREATE'`,
                ),
            ).toBe("0");
            // e na prática: nenhum objeto novo (uma função, uma tabela ou uma visão no lugar de
            // um nome que as funções do site resolvem por search_path)
            for (const statement of [
                "create table public.invasora (a int)",
                "create view public.invasora as select 1 as a",
                "create function public.invasora() returns int language sql as 'select 1'",
                "create type public.invasora as enum ('a')",
            ]) {
                expect(() => runScript("kinne_app", `${statement};`), statement).toThrow();
            }
        });

        it("as funções internas não são do site, e a limpeza é só do kinne_sync", () => {
            denied("kinne_app", "select kinne_user_of('x')");
            denied("kinne_app", "select kinne_trim_user(1)");
            denied("kinne_app", "select kinne_merge_browser(1, '{}', '{}', '{}', '{}', '{}')");
            denied("kinne_app", "select kinne_purge_expired_auth()");
            denied(
                "kinne_sync",
                "select kinne_sign_in('a', 'b', 'c', 'd', '{}', '{}', '{}', '{}', '{}')",
            );
            expect(() =>
                runAs("kinne_sync", sql.raw("select kinne_purge_expired_auth()")),
            ).not.toThrow();
        });

        it("o kinne_sync só lê a coluna do título nas tabelas de gosto e não toca no resto", () => {
            expect(() =>
                runAs("kinne_sync", sql.raw("select catalog_title_id from user_taste_signals")),
            ).not.toThrow();
            expect(() =>
                runAs("kinne_sync", sql.raw("select catalog_title_id from user_watched")),
            ).not.toThrow();
            denied("kinne_sync", "select user_id from user_taste_signals");
            denied("kinne_sync", "select * from user_watched");
            denied("kinne_sync", "select * from users");
            denied("kinne_sync", "select * from sign_in_codes");
            denied("kinne_sync", "select * from user_sessions");
            denied("kinne_sync", "delete from user_taste_signals");
        });

        it("a carga do catálogo (kinne_sync) vê como referenciado o título que alguém marcou", () => {
            account("marcou@accounts.test", { liked: [9101], watched: [9102] });
            const { sql: text } = drizzle(neon("postgres://u:p@h/d"))
                .select({ id: catalogTitles.id, referenced: titleReferenced })
                .from(catalogTitles)
                .toSQL();
            const rows = runAs(
                "kinne_sync",
                sql.raw(`select * from (${text}) t where id in (9101, 9102, 9110) order by id`),
            );
            const flags = Object.fromEntries(
                rows.map((r) => [
                    Number(r.id),
                    Object.values(r).find((v) => typeof v === "boolean"),
                ]),
            );
            expect(flags).toEqual({ 9101: true, 9102: true, 9110: false });
        });

        it("a limpeza apaga as sessões vencidas e os códigos com mais de um dia, e só eles", () => {
            const live = account("viva@accounts.test");
            const dead = account("morta@accounts.test");
            admin(
                `update user_sessions set expires_at = now() - interval '1 second' where token_hash = '${dead}'`,
            );
            request("velho@accounts.test", "111111");
            admin(
                "update sign_in_codes set created_at = now() - interval '2 days', expires_at = now() - interval '2 days' + interval '10 minutes' where email_hash = '" +
                    emailHash("velho@accounts.test", SECRET) +
                    "'",
            );
            request("novo@accounts.test", "111111");
            runAs("kinne_sync", sql.raw("select kinne_purge_expired_auth()"));
            expect(first(app(q.sessionUser(live)))).not.toBeNull();
            expect(admin(`select count(*) from user_sessions where token_hash = '${dead}'`)).toBe(
                "0",
            );
            expect(
                admin(
                    "select count(*) from sign_in_codes where email_hash = '" +
                        emailHash("velho@accounts.test", SECRET) +
                        "'",
                ),
            ).toBe("0");
            expect(
                admin(
                    "select count(*) from sign_in_codes where email_hash = '" +
                        emailHash("novo@accounts.test", SECRET) +
                        "'",
                ),
            ).toBe("1");
        });
    });
    // Revisão de segurança do PR #34 (C1): sem pg_temp no fim do search_path, quem executa SQL como
    // kinne_app põe uma tabela temporária no lugar de user_sessions ou sign_in_codes e as funções
    // definer passam a ler as linhas falsas.
    describe("funções definer não confiam em tabelas temporárias (C1)", () => {
        const database = () => admin("select current_database()");
        const withTempGranted = <T>(run: () => T): T => {
            admin(`grant temporary on database ${database()} to kinne_app`);
            try {
                return run();
            } finally {
                admin(`revoke temporary on database ${database()} from kinne_app`);
            }
        };
        const searchPaths = () =>
            admin(
                `select p.proname || '|' || coalesce((select c from unnest(p.proconfig) c where c like 'search_path=%'), '')
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.prosecdef order by 1`,
            )
                .split("\n")
                .map((line) => line.split("|") as [string, string]);

        it("toda função SECURITY DEFINER tem pg_temp por último no search_path", () => {
            const rows = searchPaths();
            expect(rows.length).toBeGreaterThan(15);
            const wrong = rows.filter(([, path]) => !/^search_path=.*, pg_temp$/.test(path));
            expect(wrong.map(([name]) => name)).toEqual([]);
        });

        it("as funções novas das contas não enxergam o esquema public sem qualificar", () => {
            const accounts = searchPaths().filter(
                ([name]) =>
                    name.startsWith("kinne_") &&
                    !["kinne_take_tokens", "kinne_trip_breaker"].includes(name) &&
                    !name.includes("group_room"),
            );
            expect(accounts.length).toBeGreaterThan(12);
            expect(
                accounts.filter(([, path]) => path !== "search_path=pg_catalog, pg_temp"),
            ).toEqual([]);
        });

        it("o site não pode criar tabela temporária (REVOKE TEMP de PUBLIC e kinne_app)", () => {
            expect(
                admin(
                    `select has_database_privilege('kinne_app', current_database(), 'TEMPORARY')`,
                ),
            ).toBe("f");
            expect(() =>
                runScript("kinne_app", "create temp table qualquer_coisa (a int);"),
            ).toThrow();
        });

        it("ataque: user_sessions temporária com linha falsa não faz kinne_session_email devolver o e-mail alheio", () => {
            const victim = account("vitima-temp@accounts.test");
            const victimId = userIdOf(victim);
            const fake = "f".repeat(64);
            const out = withTempGranted(() =>
                runScript(
                    "kinne_app",
                    `create temp table user_sessions (id int, user_id int, token_hash char(64),
                        created_at timestamptz, last_used_at timestamptz,
                        expires_at timestamptz, absolute_expires_at timestamptz);
                     insert into user_sessions values (1, ${victimId}, '${fake}', now(), now(),
                        now() + interval '1 day', now() + interval '1 day');
                     select coalesce(kinne_session_email('${fake}'), 'NULO');`,
                ),
            );
            expect(out).toBe("NULO");
        });

        it("ataque: sign_in_codes temporária com código falso não deixa kinne_sign_in abrir sessão", () => {
            const email = "alvo-temp@accounts.test";
            const code = "424242";
            const token = newToken();
            const columns = admin(
                `select string_agg(attname || ' ' || format_type(atttypid, atttypmod), ', ' order by attnum)
                 from pg_attribute where attrelid = 'public.sign_in_codes'::regclass
                 and attnum > 0 and not attisdropped`,
            );
            const call = renderSql(
                q.signIn({
                    ...hashes(email, code),
                    email,
                    tokenHash: token,
                    streamings: [],
                    watched: [],
                    liked: [],
                    willWatch: [],
                    disliked: [],
                }),
            );
            const out = withTempGranted(() =>
                runScript(
                    "kinne_app",
                    `create temp table sign_in_codes (${columns});
                     insert into sign_in_codes (id, purpose, email_hash, code_hash, attempts, created_at, expires_at)
                        values (1, 'sign_in', '${hashes(email, code).emailHash}', '${hashes(email, code).codeHash}',
                        0, now(), now() + interval '10 minutes');
                     select (result::jsonb)->>'status' from (${call}) t;`,
                ),
            );
            expect(out).not.toBe("ok");
            expect(admin(`select count(*) from user_sessions where token_hash = '${token}'`)).toBe(
                "0",
            );
            expect(admin(`select count(*) from users where email = '${email}'`)).toBe("0");
        });
    });
    describe("B4. o banco também recusa o que não é um endereço", () => {
        const insert = (email: string) => {
            const quoted = email.replaceAll("'", "''");
            admin(`delete from users where email = '${quoted}'`);
            admin(`insert into users (email) values ('${quoted}')`);
        };
        it("lista de endereços, aspas, <>, ponto duplo, não ASCII e local longo violam o CHECK", () => {
            for (const email of [
                "a@x.com,b@y.com",
                "a@x.com;b@y.com",
                "<a@b.com>",
                '"a"@b.com',
                "a'b@x.com",
                "a..b@x.com",
                ".a@x.com",
                "a.@x.com",
                "a@x_y.com",
                "a@-x.com",
                "a@x..com",
                "joão@exemplo.com",
                "a@b.c",
                `${"l".repeat(65)}@x.com`,
            ]) {
                expect(() => insert(email), email).toThrow();
            }
        });

        it("o mesmo critério do servidor: o que normalizeEmail aceita o banco aceita, e vice-versa", () => {
            for (const raw of [
                "ana@accounts.test",
                "ana.silva+k@accounts.test",
                "a_b-c@sub.accounts.test",
                "x@xn--e1afmkfd.xn--p1ai",
                "a@b.co",
                "a@b.c",
                "a b@accounts.test",
                "a@@accounts.test",
                "a@accounts..test",
            ]) {
                const email = normalizeEmail(raw);
                let accepted = true;
                try {
                    insert(raw.trim().toLowerCase());
                } catch {
                    accepted = false;
                }
                expect(accepted, raw).toBe(email !== null);
            }
            admin("delete from users where email like '%@accounts.test'");
        });
    });
    describe("M1. o desafio do navegador (banco)", () => {
        const attemptsOf = (email: string) =>
            admin(
                `select attempts from sign_in_codes where email_hash = '${emailHash(email, SECRET)}' and purpose = 'sign_in' order by id desc limit 1`,
            );

        it("sem o desafio, ou com outro, nada conta e nada entra, nem com o código certo", () => {
            const email = "desafio-db@accounts.test";
            request(email, "123456");
            for (const challengeHash of [null, sessionTokenHash("outro"), "", "x".repeat(64)]) {
                for (const code of ["000000", "123456"]) {
                    const answer = first<SignInResult>(
                        app(
                            q.signIn({
                                ...hashes(email, code),
                                challengeHash,
                                email,
                                tokenHash: newToken(),
                                streamings: [],
                                watched: [],
                                liked: [],
                                willWatch: [],
                                disliked: [],
                            }),
                        ),
                    );
                    expect(answer.status, `${challengeHash} ${code}`).toBe("invalid");
                }
            }
            expect(attemptsOf(email)).toBe("0");
            expect(admin(`select count(*) from users where email = '${email}'`)).toBe("0");
            expect(signIn(email, "123456", newToken()).status).toBe("ok");
        });

        it("quem não tem o desafio nem descobre que o código foi queimado", () => {
            const email = "queimado-db@accounts.test";
            request(email, "123456");
            for (let i = 0; i < 5; i++) signIn(email, "000000", newToken());
            expect(signIn(email, "123456", newToken()).status).toBe("locked");
            const stranger = first<SignInResult>(
                app(
                    q.signIn({
                        ...hashes(email, "123456"),
                        challengeHash: sessionTokenHash("estranho"),
                        email,
                        tokenHash: newToken(),
                        streamings: [],
                        watched: [],
                        liked: [],
                        willWatch: [],
                        disliked: [],
                    }),
                ),
            );
            expect(stranger.status).toBe("invalid");
        });

        it("a espera cresce com os códigos queimados e só pega o mesmo e-mail", () => {
            const email = "espera-db@accounts.test";
            const wait = () => first<string>(app(q.requestCode({ ...hashes(email, "111111") })));
            for (let i = 0; i < 3; i++) {
                expect(wait()).toBe("ok");
                for (let j = 0; j < 5; j++) signIn(email, "000000", newToken());
            }
            expect(wait()).toBe("wait");
            expect(
                first<string>(
                    app(q.requestCode({ ...hashes("outra-espera@accounts.test", "111111") })),
                ),
            ).toBe("ok");
            admin(
                "update sign_in_codes set used_at = now() - interval '61 minutes' where attempts >= 5",
            );
            expect(wait()).toBe("ok");
        });

        it("códigos queimados há mais de 24 h não contam", () => {
            const email = "velho-queimado@accounts.test";
            for (let i = 0; i < 3; i++) {
                first(app(q.requestCode({ ...hashes(email, "111111") })));
                for (let j = 0; j < 5; j++) signIn(email, "000000", newToken());
            }
            admin(
                `update sign_in_codes set created_at = now() - interval '25 hours', expires_at = now() - interval '24 hours 50 minutes', used_at = now() - interval '24 hours 55 minutes' where email_hash = '${emailHash(email, SECRET)}'`,
            );
            expect(first<string>(app(q.requestCode({ ...hashes(email, "111111") })))).toBe("ok");
        });
    });
    // Revisão B6: o limite de 5 tentativas e o uso único do código dependem do lock do banco; só
    // várias conexões de verdade, ao mesmo tempo, mostram se ele segura.
    describe("B6. concorrência de verdade (várias conexões)", () => {
        const call = (email: string, code: string) =>
            runAsAsync(
                "kinne_app",
                q.signIn({
                    ...hashes(email, code),
                    email,
                    tokenHash: newToken(),
                    streamings: [],
                    watched: [],
                    liked: [],
                    willWatch: [],
                    disliked: [],
                }),
            ).then((rows) => first<SignInResult>(rows).status);
        const attempts = (email: string) =>
            Number(
                admin(
                    `select attempts from sign_in_codes where email_hash = '${emailHash(email, SECRET)}' order by id desc limit 1`,
                ),
            );

        it("20 palpites errados ao mesmo tempo gastam exatamente 5 tentativas, e o código morre", async () => {
            const email = "corrida-erros@accounts.test";
            request(email, "123456");
            const statuses = await Promise.all(
                Array.from({ length: 20 }, () => call(email, "000000")),
            );
            expect(attempts(email)).toBe(5);
            expect(statuses.filter((s) => s === "invalid")).toHaveLength(4);
            expect(statuses.filter((s) => s === "locked")).toHaveLength(16);
            expect(await call(email, "123456")).toBe("locked");
        });

        it("10 confirmações certas ao mesmo tempo abrem uma sessão só", async () => {
            const email = "corrida-certo@accounts.test";
            request(email, "123456");
            const statuses = await Promise.all(
                Array.from({ length: 10 }, () => call(email, "123456")),
            );
            expect(statuses.filter((s) => s === "ok")).toHaveLength(1);
            expect(statuses.filter((s) => s === "invalid")).toHaveLength(9);
            expect(
                admin(
                    `select count(*) from user_sessions s join users u on u.id = s.user_id where u.email = '${email}'`,
                ),
            ).toBe("1");
        });

        it("o certo e os errados no limite das 5 tentativas: ou entra um, ou o código morre, nunca os dois", async () => {
            for (let round = 0; round < 6; round++) {
                const email = `corrida-limite${round}@accounts.test`;
                request(email, "123456");
                for (let i = 0; i < 4; i++) await call(email, "000000");
                const statuses = await Promise.all([
                    call(email, "123456"),
                    ...Array.from({ length: 6 }, () => call(email, "000000")),
                ]);
                const oks = statuses.filter((s) => s === "ok").length;
                expect(attempts(email), `rodada ${round}`).toBeLessThanOrEqual(5);
                expect(oks + (attempts(email) === 5 ? 1 : 0), `rodada ${round}`).toBe(1);
            }
        });

        it("pedidos de código ao mesmo tempo deixam um código vivo só", async () => {
            const email = "corrida-pedidos@accounts.test";
            await Promise.all(
                Array.from({ length: 12 }, (_, i) =>
                    runAsAsync("kinne_app", q.requestCode({ ...hashes(email, `10000${i % 10}`) })),
                ),
            );
            expect(
                admin(
                    `select count(*) from sign_in_codes where email_hash = '${emailHash(email, SECRET)}' and used_at is null`,
                ),
            ).toBe("1");
        });
    });

    describe("B2. a carga diária purga sessões e códigos vencidos", () => {
        it("DrizzleCatalogRepository.purgeExpiredAuth, como kinne_sync, apaga só o vencido", async () => {
            const live = account("purga-viva@accounts.test");
            const dead = account("purga-morta@accounts.test");
            admin(
                `update user_sessions set expires_at = now() - interval '1 second' where token_hash = '${dead}'`,
            );
            request("purga-codigo@accounts.test", "111111");
            admin(
                `update sign_in_codes set created_at = now() - interval '2 days', expires_at = now() - interval '2 days' + interval '10 minutes' where email_hash = '${emailHash("purga-codigo@accounts.test", SECRET)}'`,
            );
            const repository = new DrizzleCatalogRepository(localDb("kinne_sync") as never);
            expect(await repository.purgeExpiredAuth()).toBeGreaterThanOrEqual(2);
            expect(first(app(q.sessionUser(live)))).not.toBeNull();
            expect(admin(`select count(*) from user_sessions where token_hash = '${dead}'`)).toBe(
                "0",
            );
            expect(
                admin(
                    `select count(*) from sign_in_codes where email_hash = '${emailHash("purga-codigo@accounts.test", SECRET)}'`,
                ),
            ).toBe("0");
        });
    });
});
