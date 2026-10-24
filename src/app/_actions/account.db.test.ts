import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { admin, dbTestsEnabled, localDb } from "@/test/local-pg";

// Os dez testes de ataque de docs/threats/accounts.md (mais o 11, entre contas), chamando as
// AÇÕES de verdade com entradas forjadas, contra um PostgreSQL de verdade. O que o banco garante
// por si está em src/infrastructure/db/accounts.db.test.ts. Cada teste falha se o ataque funciona.

const cookieJar = new Map<string, string>();
const cookieWrites: { name: string; value: string; options: Record<string, unknown> }[] = [];
let requestHeaders = new Headers();
const afterTasks: (() => Promise<void>)[] = [];

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
        set: (name: string, value: string, options: Record<string, unknown> = {}) => {
            cookieWrites.push({ name, value, options });
            if (options.maxAge === 0 || value === "") cookieJar.delete(name);
            else cookieJar.set(name, value);
        },
        delete: (name: string) => cookieJar.delete(name),
    }),
    headers: async () => requestHeaders,
}));
vi.mock("next/server", () => ({
    after: (task: () => Promise<void>) => {
        afterTasks.push(task);
    },
}));
// "banco fora do ar": a única forma de testar o que as ações fazem quando o banco não responde
let dbDown = false;
const downDb = {
    execute: async () => {
        throw new Error("banco fora do ar");
    },
};
vi.mock("@/infrastructure/db/client", () => ({ createDb: () => (dbDown ? downDb : localDb()) }));
vi.mock("../_data/candidates", () => ({ candidates: async () => [] }));
vi.mock("../_data/taste-graph", () => ({ neighborGraphOrNull: async () => null }));
vi.mock("../_data/feelings", () => ({ loadFeelingKit: async () => null }));

const COOKIE = "__Host-kinne_session";
const SECRET = "a".repeat(48);
const TITLES = [9201, 9202, 9203, 9204, 9205, 9206];
const NO_BROWSER = {
    streamings: [],
    watched: [],
    taste: { liked: [], willWatch: [], disliked: [] },
};

let ipCounter = 0;
const devMail = vi.fn();

type Actions = typeof import("./account");
let actions: Actions;

const flush = async () => {
    await Promise.all(afterTasks.splice(0).map((task) => task()));
};

/** O último código que o envio de desenvolvimento escreveu no terminal. */
function lastCode(): string {
    const text = String(devMail.mock.calls.at(-1)?.[0] ?? "");
    const match = /(\d{3}) (\d{3})/.exec(text);
    if (!match) throw new Error("nenhum código impresso");
    return `${match[1]}${match[2]}`;
}

async function codeFor(email: string): Promise<string> {
    expect(await actions.requestCode({ email })).toBe("sent");
    await flush();
    return lastCode();
}

async function signUp(email: string): Promise<{ cookie: string }> {
    resetLimits();
    const code = await codeFor(email);
    const answer = await actions.verifyCode({ email, code, browser: NO_BROWSER });
    expect(answer.kind).toBe("ok");
    return { cookie: cookieJar.get(COOKIE)! };
}

/** Zera os baldes do limitador, para o teste não esbarrar nos limites que não está testando. */
const resetLimits = () => admin("delete from rate_limit_buckets");

const userCount = (email: string) =>
    Number(admin(`select count(*) from users where email = '${email}'`));

describe.skipIf(!dbTestsEnabled)("ataques às ações das contas", () => {
    beforeAll(() => {
        for (const id of TITLES) {
            admin(`insert into catalog_titles (id, tmdb_id, title_type, slug, display_title, original_title,
                tmdb_average_rating, tmdb_vote_count, last_synced_at, is_recommendable)
                values (${id}, ${id}, 'movie', 'ataque-${id}', 'Título ${id}', 'Title ${id}', 7.5, 1000, now(), true)
                on conflict (id) do nothing`);
        }
    });

    afterAll(() => {
        admin("delete from users where email like '%@ataque.test'");
        admin("delete from sign_in_codes");
        admin("delete from catalog_titles where id between 9201 and 9206");
    });

    beforeEach(async () => {
        admin("delete from users where email like '%@ataque.test'");
        admin("delete from sign_in_codes");
        admin("delete from rate_limit_buckets");
        cookieJar.clear();
        cookieWrites.length = 0;
        afterTasks.length = 0;
        devMail.mockReset();
        ipCounter++;
        requestHeaders = new Headers({ "x-real-ip": `203.0.113.${ipCounter % 250}` });
        vi.stubEnv("VERCEL", "1");
        vi.stubEnv("AUTH_SECRET", SECRET);
        vi.stubEnv("NODE_ENV", "development");
        dbDown = false;
        vi.stubEnv("RESEND_API_KEY", "");
        vi.stubEnv("VERCEL_ENV", "");
        vi.spyOn(console, "info").mockImplementation(devMail);
        vi.resetModules();
        actions = await import("./account");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------------------------
    describe("1. força bruta no código", () => {
        it("6 erros no mesmo código: o 6º e o código certo falham", async () => {
            const email = "forca@ataque.test";
            const code = await codeFor(email);
            const wrong = ["000001", "000002", "000003", "000004", "000005", "000006"].filter(
                (c) => c !== code,
            );
            const answers: string[] = [];
            for (const guess of wrong.slice(0, 5)) {
                answers.push(
                    (await actions.verifyCode({ email, code: guess, browser: NO_BROWSER })).kind,
                );
            }
            expect(answers).toEqual(["invalid", "invalid", "invalid", "invalid", "locked"]);
            expect(
                (
                    await actions.verifyCode({
                        email,
                        code: wrong[5] ?? "000009",
                        browser: NO_BROWSER,
                    })
                ).kind,
            ).toBe("locked");
            expect((await actions.verifyCode({ email, code, browser: NO_BROWSER })).kind).toBe(
                "locked",
            );
            expect(cookieJar.has(COOKIE)).toBe(false);
            expect(userCount(email)).toBe(0);
        });

        it("o limite por IP também freia: 20 tentativas em 10 minutos", async () => {
            let limited = 0;
            for (let i = 0; i < 25; i++) {
                const answer = await actions.verifyCode({
                    email: `ip${i}@ataque.test`,
                    code: "000000",
                    browser: NO_BROWSER,
                });
                if (answer.kind === "limited") limited++;
            }
            expect(limited).toBe(5);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("2. repetir o código", () => {
        it("o código certo duas vezes: a segunda falha", async () => {
            const email = "replay@ataque.test";
            const code = await codeFor(email);
            expect((await actions.verifyCode({ email, code, browser: NO_BROWSER })).kind).toBe(
                "ok",
            );
            cookieJar.clear();
            expect((await actions.verifyCode({ email, code, browser: NO_BROWSER })).kind).toBe(
                "invalid",
            );
            expect(cookieJar.has(COOKIE)).toBe(false);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("3. código de um e-mail usado em outro", () => {
        it("o código emitido para A não entra na conta de B", async () => {
            const codeA = await codeFor("a@ataque.test");
            const challengeA = cookieJar.get("__Host-kinne_challenge")!;
            const codeB = await codeFor("b@ataque.test");
            expect(codeA).not.toBe(codeB);
            const attack = await actions.verifyCode({
                email: "b@ataque.test",
                code: codeA,
                browser: NO_BROWSER,
            });
            expect(attack.kind).toBe("invalid");
            expect(cookieJar.has(COOKIE)).toBe(false);
            expect(userCount("b@ataque.test")).toBe(0);
            // o código de A continua valendo para A, com o e-mail em outra caixa e com espaços
            cookieJar.set("__Host-kinne_challenge", challengeA);
            const real = await actions.verifyCode({
                email: "  A@Ataque.TEST ",
                code: codeA,
                browser: NO_BROWSER,
            });
            expect(real.kind).toBe("ok");
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("4. enumeração de e-mails", () => {
        it("a resposta é a mesma, o código sai para os dois e o tempo não separa quem tem conta", async () => {
            const rounds = 12;
            const known = Array.from({ length: rounds }, (_, i) => `conhecido${i}@ataque.test`);
            const unknown = Array.from(
                { length: rounds },
                (_, i) => `desconhecido${i}@ataque.test`,
            );
            for (const email of known) admin(`insert into users (email) values ('${email}')`);

            const run = async (emails: string[]) => {
                const times: number[] = [];
                const answers: string[] = [];
                for (const email of emails) {
                    // um IP por pedido: o que se mede aqui é o e-mail, não o limite por IP
                    ipCounter++;
                    requestHeaders = new Headers({ "x-real-ip": `198.51.100.${ipCounter % 250}` });
                    const started = performance.now();
                    answers.push(JSON.stringify(await actions.requestCode({ email })));
                    times.push(performance.now() - started);
                }
                return { times, answers };
            };
            // alterna os blocos para a deriva do ambiente não pesar só em um deles
            const a = await run(known.slice(0, rounds / 2));
            const b = await run(unknown.slice(0, rounds / 2));
            const c = await run(known.slice(rounds / 2));
            const d = await run(unknown.slice(rounds / 2));
            const knownRun = {
                times: [...a.times, ...c.times],
                answers: [...a.answers, ...c.answers],
            };
            const unknownRun = {
                times: [...b.times, ...d.times],
                answers: [...b.answers, ...d.answers],
            };

            // bytes iguais
            expect(new Set(knownRun.answers)).toEqual(new Set(['"sent"']));
            expect(unknownRun.answers).toEqual(knownRun.answers);
            // o mesmo efeito: um código e um envio para cada, conhecido ou não
            expect(Number(admin("select count(*) from sign_in_codes"))).toBe(rounds * 2);
            expect(afterTasks).toHaveLength(rounds * 2);
            // nenhuma conta nasce só por pedir o código
            expect(userCount("desconhecido0@ataque.test")).toBe(0);

            const median = (xs: number[]) =>
                [...xs].sort((x, y) => x - y)[Math.floor(xs.length / 2)];
            expect(Math.abs(median(knownRun.times) - median(unknownRun.times))).toBeLessThan(150);
        }, 120_000);

        it("o envio roda depois da resposta: nada é enviado dentro dela", async () => {
            expect(await actions.requestCode({ email: "depois@ataque.test" })).toBe("sent");
            expect(devMail).not.toHaveBeenCalled();
            await flush();
            expect(devMail).toHaveBeenCalledOnce();
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("5. fixação de sessão", () => {
        it("um cookie plantado antes de confirmar o código não vira a sessão", async () => {
            const planted = "P".repeat(43);
            cookieJar.set(COOKIE, planted);
            const email = "fixacao@ataque.test";
            const code = await codeFor(email);
            expect((await actions.verifyCode({ email, code, browser: NO_BROWSER })).kind).toBe(
                "ok",
            );
            const after = cookieJar.get(COOKIE)!;
            expect(after).not.toBe(planted);
            expect(after).toMatch(/^[A-Za-z0-9_-]{43}$/);
            // com o cookie que o atacante plantou, ninguém está logado
            cookieJar.set(COOKIE, planted);
            expect((await actions.accountState()).signedIn).toBe(false);
            cookieJar.set(COOKIE, after);
            expect((await actions.accountState()).signedIn).toBe(true);
        });

        it("cada entrada cria uma sessão nova", async () => {
            const email = "novas@ataque.test";
            const first = (await signUp(email)).cookie;
            const second = (await signUp(email)).cookie;
            expect(second).not.toBe(first);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("6. acessar a conta de outra pessoa pelo corpo do pedido", () => {
        async function twoAccounts() {
            const a = await signUp("a-idor@ataque.test");
            cookieJar.clear();
            const b = await signUp("b-idor@ataque.test");
            // B marca coisas, para o ataque ter o que estragar
            expect(await actions.setSignal({ slug: "ataque-9201", signal: "liked" })).toEqual({
                ok: true,
            });
            expect(await actions.setWatched({ slug: "ataque-9202", on: true })).toEqual({
                ok: true,
            });
            expect(await actions.saveStreamings({ streamings: ["globoplay"] })).toEqual({
                ok: true,
            });
            const userB = Number(admin("select id from users where email = 'b-idor@ataque.test'"));
            const snapshotB = () =>
                JSON.stringify({
                    signals: admin(
                        `select string_agg(catalog_title_id || ':' || signal, ',' order by catalog_title_id) from user_taste_signals where user_id = ${userB}`,
                    ),
                    watched: admin(
                        `select string_agg(catalog_title_id::text, ',') from user_watched where user_id = ${userB}`,
                    ),
                    streamings: admin(
                        `select string_agg(streaming, ',') from user_streamings where user_id = ${userB}`,
                    ),
                    sessions: admin(`select count(*) from user_sessions where user_id = ${userB}`),
                    onboarding: admin(
                        `select count(*) from user_onboarding where user_id = ${userB}`,
                    ),
                });
            cookieJar.set(COOKIE, a.cookie);
            return { snapshotB, userB, aCookie: a.cookie, bCookie: b.cookie };
        }

        it("nenhuma ação aceita id ou e-mail de outra pessoa: chaves desconhecidas são recusadas", async () => {
            const { snapshotB, userB } = await twoAccounts();
            const before = snapshotB();
            const bEmail = "b-idor@ataque.test";
            const forged = { userId: userB, user_id: userB, id: userB, accountId: userB };
            for (const [key, value] of Object.entries(forged)) {
                expect(
                    await actions.setSignal({ slug: "ataque-9201", signal: null, [key]: value }),
                ).toEqual({ ok: false });
                expect(
                    await actions.setWatched({ slug: "ataque-9202", on: false, [key]: value }),
                ).toEqual({ ok: false });
                expect(await actions.saveStreamings({ streamings: [], [key]: value })).toEqual({
                    ok: false,
                });
                expect(
                    await actions.saveOnboardingStep({
                        step: 2,
                        status: "skipped",
                        slugs: [],
                        streamings: [],
                        [key]: value,
                    }),
                ).toEqual({ ok: false });
                expect(await actions.deleteAccount({ code: "123456", [key]: value })).toBe(
                    "invalid",
                );
                expect(
                    (
                        await actions.verifyCode({
                            email: bEmail,
                            code: "123456",
                            browser: NO_BROWSER,
                            [key]: value,
                        })
                    ).kind,
                ).toBe("invalid");
                expect(await actions.requestCode({ email: bEmail, [key]: value })).toBe(
                    "invalid-email",
                );
            }
            expect(snapshotB()).toBe(before);
        });

        it("com o formato certo, a ação mexe só na conta da sessão, nunca na de B", async () => {
            const { snapshotB, aCookie } = await twoAccounts();
            const before = snapshotB();
            // A (a sessão aberta) tira de si os títulos que B marcou: B não muda
            expect(await actions.setSignal({ slug: "ataque-9201", signal: null })).toEqual({
                ok: true,
            });
            expect(await actions.setWatched({ slug: "ataque-9202", on: false })).toEqual({
                ok: true,
            });
            expect(await actions.saveStreamings({ streamings: ["netflix"] })).toEqual({ ok: true });
            expect(
                await actions.saveOnboardingStep({
                    step: 3,
                    status: "done",
                    slugs: [],
                    streamings: ["max"],
                }),
            ).toEqual({ ok: true });
            expect(snapshotB()).toBe(before);
            const userA = Number(admin("select id from users where email = 'a-idor@ataque.test'"));
            expect(
                admin(
                    `select string_agg(streaming, ',') from user_streamings where user_id = ${userA}`,
                ),
            ).toBe("max");
            // sair de todos os aparelhos derruba só as sessões de A
            expect(await actions.signOutAll()).toEqual({ ok: true });
            expect(snapshotB()).toBe(before);
            cookieJar.set(COOKIE, aCookie);
            expect((await actions.accountState()).signedIn).toBe(false);
        });

        it("a exportação traz só a conta da sessão, sem hashes nem sessões", async () => {
            const { bCookie } = await twoAccounts();
            cookieJar.set(COOKIE, bCookie);
            const data = await actions.exportMyData();
            expect(data?.email).toBe("b-idor@ataque.test");
            const text = JSON.stringify(data);
            expect(text).not.toContain("a-idor@ataque.test");
            expect(text).not.toMatch(/token|hash|session|[0-9a-f]{64}/i);
            expect(Object.keys(data!).sort()).toEqual([
                "createdAt",
                "email",
                "onboarding",
                "streamings",
                "taste",
                "watched",
            ]);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("7. sentimento sem sessão", () => {
        const wire = {
            streamings: [],
            type: "both",
            genres: [],
            minRating: 6.4,
            maxRuntime: null,
            personId: null,
            adult: false,
            feeling: "cry",
        };
        const request = { filters: wire, watched: [], seen: [], taste: NO_BROWSER.taste, round: 0 };

        it("a ação de sortear recusa o sentimento sem sessão, mesmo chamada direto", async () => {
            const { drawFiltered } = await import("./filters");
            await expect(drawFiltered(request)).rejects.toThrow("Pedido recusado");
        });

        it("com sessão válida, o sentimento passa", async () => {
            await signUp("sentir@ataque.test");
            const { drawFiltered } = await import("./filters");
            await expect(drawFiltered(request)).resolves.toBeTruthy();
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("8. apagar a conta sem o código novo", () => {
        it("com a sessão e sem o código, a conta continua; um código de entrar não serve", async () => {
            const email = "apagar@ataque.test";
            const loginCode = await codeFor(email);
            await actions.verifyCode({ email, code: loginCode, browser: NO_BROWSER });
            expect(userCount(email)).toBe(1);
            // sem ter pedido o código de apagar
            expect(await actions.deleteAccount({ code: "123456" })).toBe("invalid");
            // o código de entrar (já usado) não apaga
            expect(await actions.deleteAccount({ code: loginCode })).toBe("invalid");
            expect(userCount(email)).toBe(1);
            // pedido o código novo, um código errado também não
            resetLimits();
            expect(await actions.requestDeleteCode()).toBe("sent");
            await flush();
            const deleteCode = lastCode();
            const wrong = deleteCode === "000000" ? "000001" : "000000";
            expect(await actions.deleteAccount({ code: wrong })).toBe("invalid");
            expect(userCount(email)).toBe(1);
            // o código certo apaga
            expect(await actions.deleteAccount({ code: deleteCode })).toBe("deleted");
            expect(userCount(email)).toBe(0);
            expect(cookieJar.has(COOKIE)).toBe(false);
        });

        it("sem sessão, nem o código certo apaga nada", async () => {
            const email = "sem-sessao@ataque.test";
            await signUp(email);
            resetLimits();
            await actions.requestDeleteCode();
            await flush();
            const code = lastCode();
            cookieJar.clear();
            expect(await actions.deleteAccount({ code })).toBe("no-session");
            expect(await actions.requestDeleteCode()).toBe("no-session");
            expect(userCount(email)).toBe(1);
        });

        it("5 erros no código de apagar anulam o código", async () => {
            const email = "forca-apagar@ataque.test";
            await signUp(email);
            resetLimits();
            await actions.requestDeleteCode();
            await flush();
            const code = lastCode();
            const guesses = ["000001", "000002", "000003", "000004", "000005"].map((g) =>
                g === code ? "000009" : g,
            );
            const answers: string[] = [];
            for (const guess of guesses) answers.push(await actions.deleteAccount({ code: guess }));
            expect(answers).toEqual(["invalid", "invalid", "invalid", "invalid", "locked"]);
            expect(await actions.deleteAccount({ code })).toBe("locked");
            expect(userCount(email)).toBe(1);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("9. sair invalida o cookie antigo em todas as ações", () => {
        it("depois de sair, o cookie que sobrou numa cópia não vale em lugar nenhum", async () => {
            const email = "sair@ataque.test";
            const { cookie } = await signUp(email);
            expect((await actions.accountState()).signedIn).toBe(true);
            expect(await actions.signOut()).toEqual({ ok: true });
            // o navegador apagou o cookie; o atacante ficou com uma cópia
            expect(cookieJar.has(COOKIE)).toBe(false);
            cookieJar.set(COOKIE, cookie);

            expect((await actions.accountState()).signedIn).toBe(false);
            expect(await actions.saveStreamings({ streamings: ["max"] })).toEqual({ ok: false });
            expect(await actions.setSignal({ slug: "ataque-9201", signal: "liked" })).toEqual({
                ok: false,
            });
            expect(await actions.setWatched({ slug: "ataque-9201", on: true })).toEqual({
                ok: false,
            });
            expect(
                await actions.saveOnboardingStep({
                    step: 2,
                    status: "skipped",
                    slugs: [],
                    streamings: [],
                }),
            ).toEqual({ ok: false });
            expect(await actions.exportMyData()).toBeNull();
            expect(await actions.requestDeleteCode()).toBe("no-session");
            expect(await actions.deleteAccount({ code: "123456" })).toBe("no-session");
            expect(await actions.signOutAll()).toEqual({ ok: true });
            const { drawFiltered } = await import("./filters");
            await expect(
                drawFiltered({
                    filters: {
                        streamings: [],
                        type: "both",
                        genres: [],
                        minRating: 6.4,
                        maxRuntime: null,
                        personId: null,
                        adult: false,
                        feeling: "cry",
                    },
                    watched: [],
                    seen: [],
                    taste: NO_BROWSER.taste,
                    round: 0,
                }),
            ).rejects.toThrow();
            expect(
                admin(
                    `select count(*) from user_taste_signals where user_id = (select id from users where email = '${email}')`,
                ),
            ).toBe("0");
        });

        it("o cookie apagado sai com os mesmos atributos do original, para o navegador aceitar", async () => {
            await signUp("cookie@ataque.test");
            await actions.signOut();
            const clearing = cookieWrites.at(-1)!;
            expect(clearing.name).toBe(COOKIE);
            expect(clearing.options).toMatchObject({
                path: "/",
                secure: true,
                httpOnly: true,
                maxAge: 0,
            });
        });

        it("sair de todos os aparelhos derruba as outras sessões da conta", async () => {
            const email = "todos@ataque.test";
            const one = (await signUp(email)).cookie;
            const two = (await signUp(email)).cookie;
            cookieJar.set(COOKIE, two);
            await actions.signOutAll();
            for (const cookie of [one, two]) {
                cookieJar.set(COOKIE, cookie);
                expect((await actions.accountState()).signedIn).toBe(false);
            }
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("10. proteção de produção (C3)", () => {
        it("em produção sem RESEND_API_KEY, requestCode não envia nem imprime nada e não grava código", async () => {
            vi.stubEnv("NODE_ENV", "production");
            const fetchSpy = vi.spyOn(globalThis, "fetch");
            const logs = [
                console.log,
                console.info,
                console.warn,
                console.error,
                console.debug,
            ].map((fn) => vi.spyOn(console, fn.name as "log").mockImplementation(() => undefined));
            expect(await actions.requestCode({ email: "producao@ataque.test" })).toBe(
                "unavailable",
            );
            await flush();
            expect(fetchSpy).not.toHaveBeenCalled();
            for (const spy of logs) expect(spy).not.toHaveBeenCalled();
            expect(devMail).not.toHaveBeenCalled();
            expect(Number(admin("select count(*) from sign_in_codes"))).toBe(0);
        });

        it("VERCEL_ENV=production também desliga o envio de desenvolvimento", async () => {
            vi.stubEnv("VERCEL_ENV", "production");
            expect(await actions.requestCode({ email: "vercel@ataque.test" })).toBe("unavailable");
            await flush();
            expect(devMail).not.toHaveBeenCalled();
        });

        it("o envio de desenvolvimento recusa nascer em produção", async () => {
            const { consoleMailer } = await import("@/infrastructure/auth/mailer");
            expect(() => consoleMailer({ devMail: false })).toThrow();
            expect(() => consoleMailer({ devMail: true })).not.toThrow();
        });

        // B3: o envio de desenvolvimento é uma lista de permissão, não de negação
        it.each(["test", "staging", "preview", "", "Development", "dev"])(
            "NODE_ENV=%j: nada é enviado nem impresso",
            async (nodeEnv) => {
                vi.stubEnv("NODE_ENV", nodeEnv);
                expect(await actions.requestCode({ email: "lista@ataque.test" })).toBe(
                    "unavailable",
                );
                await flush();
                expect(devMail).not.toHaveBeenCalled();
                expect(Number(admin("select count(*) from sign_in_codes"))).toBe(0);
            },
        );

        it.each(["preview", "development", "production"])(
            "VERCEL_ENV=%s, mesmo com NODE_ENV=development, não imprime código (B3)",
            async (vercelEnv) => {
                vi.stubEnv("VERCEL_ENV", vercelEnv);
                expect(await actions.requestCode({ email: "vercel-env@ataque.test" })).toBe(
                    "unavailable",
                );
                await flush();
                expect(devMail).not.toHaveBeenCalled();
            },
        );

        it("só NODE_ENV=development sem VERCEL_ENV imprime o código", async () => {
            expect(await actions.requestCode({ email: "dev@ataque.test" })).toBe("sent");
            await flush();
            expect(devMail).toHaveBeenCalledOnce();
        });

        it("com RESEND_API_KEY e remetente, o envio vai ao Resend, sem imprimir o código", async () => {
            vi.stubEnv("NODE_ENV", "production");
            vi.stubEnv("RESEND_API_KEY", "re_test_key");
            vi.stubEnv("AUTH_EMAIL_FROM", "Kinne <entrar@kinne.test>");
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(new Response("{}", { status: 200 }));
            expect(await actions.requestCode({ email: "resend@ataque.test" })).toBe("sent");
            await flush();
            expect(fetchSpy).toHaveBeenCalledOnce();
            const [url, init] = fetchSpy.mock.calls[0];
            expect(url).toBe("https://api.resend.com/emails");
            expect((init as RequestInit).headers).toMatchObject({
                authorization: "Bearer re_test_key",
            });
            const body = JSON.parse(String((init as RequestInit).body));
            expect(body.to).toEqual(["resend@ataque.test"]);
            expect(body.text).toMatch(/Seu código do Kinne: \d{3} \d{3}\. Vale por 10 minutos/);
            expect(body.text).not.toMatch(/https?:/);
            expect(devMail).not.toHaveBeenCalled();
        });

        it("sem AUTH_SECRET nenhum código nasce, em qualquer ambiente", async () => {
            vi.stubEnv("AUTH_SECRET", "curto");
            expect(await actions.requestCode({ email: "sem-segredo@ataque.test" })).toBe(
                "unavailable",
            );
            expect(Number(admin("select count(*) from sign_in_codes"))).toBe(0);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("limites de pedido (D1, D2, US012 C6)", () => {
        it("um pedido por minuto por e-mail: o segundo é 'limited' e não envia", async () => {
            expect(await actions.requestCode({ email: "cool@ataque.test" })).toBe("sent");
            expect(await actions.requestCode({ email: "cool@ataque.test" })).toBe("limited");
            await flush();
            expect(devMail).toHaveBeenCalledOnce();
        });

        it("no máximo 5 por hora por e-mail", async () => {
            const answers: string[] = [];
            for (let i = 0; i < 7; i++) {
                admin(
                    "update rate_limit_buckets set tokens = 1 where key like 'auth:email:cool:%'",
                );
                answers.push(await actions.requestCode({ email: "hora@ataque.test" }));
            }
            expect(answers.filter((a) => a === "sent")).toHaveLength(5);
            expect(answers.filter((a) => a === "limited")).toHaveLength(2);
        });

        it("10 pedidos por IP em 10 minutos, para e-mails diferentes", async () => {
            const answers: string[] = [];
            for (let i = 0; i < 12; i++)
                answers.push(await actions.requestCode({ email: `ip${i}@ataque.test` }));
            expect(answers.filter((a) => a === "sent")).toHaveLength(10);
            expect(answers.filter((a) => a === "limited")).toHaveLength(2);
        });

        it("e-mail inválido é recusado sem gastar ficha nem gravar código", async () => {
            for (const email of ["", "sem-arroba", "a@b", "x".repeat(300) + "@b.co"]) {
                expect(await actions.requestCode({ email })).toBe("invalid-email");
            }
            expect(Number(admin("select count(*) from rate_limit_buckets"))).toBe(0);
            expect(Number(admin("select count(*) from sign_in_codes"))).toBe(0);
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("cookie, sessão e leitura (A2, US012 RNE005)", () => {
        it("o cookie é __Host-, HttpOnly, Secure, SameSite=Lax, Path=/, sem Domain, com 43 caracteres", async () => {
            await signUp("cookie-attrs@ataque.test");
            const set = cookieWrites.find((w) => w.name === COOKIE && w.value !== "")!;
            expect(set.name).toBe("__Host-kinne_session");
            expect(set.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
            expect(set.options).toMatchObject({
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                path: "/",
            });
            expect(set.options).not.toHaveProperty("domain");
            const lifetime = (set.options.expires as Date).getTime() - Date.now();
            expect(lifetime).toBeGreaterThan(89 * 24 * 3600 * 1000);
            expect(lifetime).toBeLessThanOrEqual(90 * 24 * 3600 * 1000);
        });

        it("o banco guarda só o hash do cookie, nunca o cookie", async () => {
            const { cookie } = await signUp("hash@ataque.test");
            expect(admin(`select count(*) from user_sessions where token_hash = '${cookie}'`)).toBe(
                "0",
            );
            expect(
                admin("select count(*) from user_sessions where token_hash ~ '^[0-9a-f]{64}$'"),
            ).toBe("1");
        });

        it("cookie com formato errado vale como visitante e nem chega ao banco", async () => {
            for (const bad of ["x", "A".repeat(42), "A".repeat(44), "!".repeat(43), ""]) {
                cookieJar.set(COOKIE, bad);
                expect((await actions.accountState()).signedIn).toBe(false);
            }
        });

        it("o navegador leva o que tinha para a conta ao entrar (US015 C1)", async () => {
            const email = "levar@ataque.test";
            const code = await codeFor(email);
            const answer = await actions.verifyCode({
                email,
                code,
                browser: {
                    streamings: ["max"],
                    watched: [9201, 9202],
                    taste: { liked: [9203], willWatch: [], disliked: [9204] },
                },
            });
            expect(answer).toEqual({ kind: "ok", isNew: true });
            const state = await actions.accountState();
            expect(state.signedIn && state.account.streamings).toEqual(["max"]);
            expect(state.signedIn && state.account.liked.map((t) => t.slug)).toEqual([
                "ataque-9203",
            ]);
            expect(state.signedIn && state.account.disliked.map((t) => t.slug)).toEqual([
                "ataque-9204",
            ]);
            expect(state.signedIn && state.account.watched.map((t) => t.slug).sort()).toEqual([
                "ataque-9201",
                "ataque-9202",
            ]);
        });

        it("entrada com lista enorme, id negativo ou chave desconhecida é recusada (B1)", async () => {
            const email = "grande@ataque.test";
            const code = await codeFor(email);
            const bad = [
                { ...NO_BROWSER, watched: Array.from({ length: 1001 }, (_, i) => i + 1) },
                { ...NO_BROWSER, watched: [-1] },
                {
                    ...NO_BROWSER,
                    taste: {
                        liked: Array.from({ length: 201 }, (_, i) => i + 1),
                        willWatch: [],
                        disliked: [],
                    },
                },
                { ...NO_BROWSER, streamings: ["hbo"] },
                { ...NO_BROWSER, extra: 1 },
            ];
            for (const browser of bad) {
                expect((await actions.verifyCode({ email, code, browser })).kind).toBe("invalid");
            }
            expect(userCount(email)).toBe(0);
        });

        it("onboarding: no máximo 3 títulos, só do catálogo, e o passo inválido não grava nada", async () => {
            await signUp("onboard@ataque.test");
            const step = (slugs: string[], status: "done" | "skipped" = "done") =>
                actions.saveOnboardingStep({ step: 1, status, slugs, streamings: [] });
            expect(await step(["ataque-9201", "ataque-9202"])).toEqual({ ok: false });
            expect(
                await step(["ataque-9201", "ataque-9202", "ataque-9203", "ataque-9204"]),
            ).toEqual({ ok: false });
            expect(await step(["ataque-9201", "ataque-9202", "nao-existe-1999"])).toEqual({
                ok: false,
            });
            expect(await step(["ataque-9201", "ataque-9201", "ataque-9202"])).toEqual({
                ok: false,
            });
            expect(await step(["../etc/passwd", "ataque-9201", "ataque-9202"])).toEqual({
                ok: false,
            });
            expect(admin("select count(*) from user_onboarding")).toBe("0");
            expect(await step(["ataque-9201", "ataque-9202", "ataque-9203"])).toEqual({ ok: true });
            expect(admin("select count(*) from user_taste_signals")).toBe("3");
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("nada de e-mail, código ou token no log (C2)", () => {
        it("o fluxo inteiro, com acertos e erros, não escreve e-mail, código nem cookie em log", async () => {
            const sent: string[] = [];
            vi.resetModules();
            vi.doMock("@/infrastructure/auth/mailer", () => ({
                selectMailer: () => ({
                    send: async (_to: string, message: { text: string }) => {
                        sent.push(message.text);
                    },
                }),
            }));
            actions = await import("./account");
            const spies = (["log", "info", "warn", "error", "debug"] as const).map((level) =>
                vi.spyOn(console, level).mockImplementation(() => undefined),
            );
            const email = "log@ataque.test";
            await actions.requestCode({ email });
            await flush();
            const code = /(\d{3}) (\d{3})/.exec(sent[0])!.slice(1, 3).join("");
            await actions.verifyCode({ email, code: "000000", browser: NO_BROWSER });
            await actions.verifyCode({ email, code, browser: NO_BROWSER });
            const cookie = cookieJar.get(COOKIE)!;
            await actions.requestDeleteCode();
            await actions.deleteAccount({ code: "111111" });
            await actions.signOut();
            // erros do banco também não devem vazar para o log
            await actions.verifyCode({ email: "x", code: "y", browser: NO_BROWSER } as never);
            const output = spies.flatMap((spy) => spy.mock.calls.flat()).join("\n");
            expect(output).not.toContain(email);
            expect(output).not.toContain(code);
            expect(output).not.toContain(cookie);
            for (const spy of spies) expect(spy).not.toHaveBeenCalled();
            vi.doUnmock("@/infrastructure/auth/mailer");
        });

        it("os eventos anônimos nunca levam o e-mail nem o id da conta", async () => {
            const { parseUsageEvent } = await import("@/application/usage-events");
            const base = {
                browserId: "0b7c5a52-3f0e-4c1e-9d55-8f1a3c2b6e71",
                name: "app_opened",
                source: null,
                titleId: null,
            };
            expect(parseUsageEvent(base)).not.toBeNull();
            for (const extra of [{ userId: 1 }, { email: "a@b.co" }, { accountId: 3 }]) {
                expect(parseUsageEvent({ ...base, ...extra })).toBeNull();
            }
        });
    });
    // -----------------------------------------------------------------------------------------
    // Revisão de segurança do PR #34
    describe("M1. o código só vale no navegador que o pediu", () => {
        const CHALLENGE = "__Host-kinne_challenge";
        const WRONG = ["000001", "000002", "000003", "000004", "000005", "000006", "000007"];
        const verify = (email: string, code: string) =>
            actions.verifyCode({ email, code, browser: NO_BROWSER });
        const wrongFor = (code: string) => WRONG.filter((c) => c !== code);
        /** Gasta as 5 tentativas do código vivo e o deixa queimado. */
        async function burn(email: string) {
            resetLimits();
            const code = await codeFor(email);
            for (const guess of wrongFor(code).slice(0, 5)) await verify(email, guess);
        }

        it("quem só sabe o e-mail não gasta as tentativas do código", async () => {
            const email = "amarrado@ataque.test";
            const code = await codeFor(email);
            const mine = cookieJar.get(CHALLENGE);
            expect(mine, "o pedido devolve o cookie do desafio").toBeDefined();
            cookieJar.delete(CHALLENGE);
            // outro navegador: 7 palpites errados, e nenhum conta nem vira "locked"
            for (const guess of wrongFor(code)) {
                expect((await verify(email, guess)).kind).toBe("invalid");
            }
            expect(admin("select max(attempts) from sign_in_codes")).toBe("0");
            cookieJar.set(CHALLENGE, mine!);
            expect((await verify(email, code)).kind).toBe("ok");
        });

        it("o código certo, sem o cookie do desafio, não abre a conta", async () => {
            const email = "sem-cookie@ataque.test";
            const code = await codeFor(email);
            const mine = cookieJar.get(CHALLENGE);
            expect(mine).toBeDefined();
            cookieJar.delete(CHALLENGE);
            expect((await verify(email, code)).kind).toBe("invalid");
            expect(cookieJar.has(COOKIE)).toBe(false);
            expect(userCount(email)).toBe(0);
            cookieJar.set(CHALLENGE, mine!);
            expect((await verify(email, code)).kind).toBe("ok");
        });

        it("o cookie de outro pedido não serve", async () => {
            const code = await codeFor("a-desafio@ataque.test");
            const cookieA = cookieJar.get(CHALLENGE);
            cookieJar.clear();
            resetLimits();
            const codeB = await codeFor("b-desafio@ataque.test");
            expect(cookieA).toBeDefined();
            cookieJar.set(CHALLENGE, cookieA!);
            expect((await verify("b-desafio@ataque.test", codeB)).kind).toBe("invalid");
            expect((await verify("a-desafio@ataque.test", code)).kind).toBe("ok");
        });

        it("o cookie é __Host-, HttpOnly, Secure, Lax, Path=/ e dura 10 minutos; o banco guarda só o hash", async () => {
            await codeFor("atributos@ataque.test");
            const set = cookieWrites.find((w) => w.name === CHALLENGE)!;
            expect(set).toBeDefined();
            expect(set.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
            expect(set.options).toMatchObject({
                httpOnly: true,
                secure: true,
                sameSite: "lax",
                path: "/",
                maxAge: 600,
            });
            expect(set.options).not.toHaveProperty("domain");
            const stored = admin("select challenge_hash from sign_in_codes");
            expect(stored).toMatch(/^[0-9a-f]{64}$/);
            expect(stored).not.toBe(set.value);
            expect(
                admin(`select count(*) from sign_in_codes where challenge_hash = '${set.value}'`),
            ).toBe("0");
        });

        it("responde igual para e-mail com conta e sem conta, e entrar apaga o cookie do desafio", async () => {
            await signUp("existe-desafio@ataque.test");
            cookieJar.clear();
            resetLimits();
            expect(await actions.requestCode({ email: "existe-desafio@ataque.test" })).toBe("sent");
            const known = cookieWrites.filter((w) => w.name === CHALLENGE).length;
            expect(await actions.requestCode({ email: "nunca-vi@ataque.test" })).toBe("sent");
            expect(cookieWrites.filter((w) => w.name === CHALLENGE).length).toBe(known + 1);
            await flush();
            const code = lastCode();
            expect((await verify("nunca-vi@ataque.test", code)).kind).toBe("ok");
            expect(cookieJar.has(CHALLENGE)).toBe(false);
        });

        it("3 códigos queimados em 24 h: o pedido seguinte espera 1 hora, depois 2, e assim por diante", async () => {
            const email = "queimado@ataque.test";
            for (let i = 0; i < 3; i++) await burn(email);
            devMail.mockClear();
            resetLimits();
            expect(await actions.requestCode({ email })).toBe("limited");
            await flush();
            expect(devMail).not.toHaveBeenCalled();
            // 61 minutos depois do último código queimado: libera
            admin(
                "update sign_in_codes set used_at = now() - interval '61 minutes' where attempts >= 5",
            );
            resetLimits();
            expect(await actions.requestCode({ email })).toBe("sent");
            // queimando o quarto, a espera dobra: 61 minutos já não bastam
            const code4 = (await flush(), lastCode());
            for (const guess of wrongFor(code4).slice(0, 5)) await verify(email, guess);
            admin(
                "update sign_in_codes set used_at = now() - interval '61 minutes' where attempts >= 5",
            );
            resetLimits();
            expect(await actions.requestCode({ email })).toBe("limited");
            admin(
                "update sign_in_codes set used_at = now() - interval '121 minutes' where attempts >= 5",
            );
            resetLimits();
            expect(await actions.requestCode({ email })).toBe("sent");
        });

        it("a espera vale para qualquer e-mail, com ou sem conta, e não pega os outros", async () => {
            for (let i = 0; i < 3; i++) await burn("espera@ataque.test");
            resetLimits();
            expect(await actions.requestCode({ email: "outro-alvo@ataque.test" })).toBe("sent");
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("B4. só um endereço de e-mail, e um só", () => {
        const EVIL = [
            "a@x.com,b@y.com",
            "a@x.com;b@y.com",
            "<a@b.com>",
            '"a"@b.com',
            "a'b@x.com",
            "a@x.com b@y.com",
            "a..b@x.com",
            ".a@x.com",
            "a.@x.com",
            "a@x_y.com",
            "a@-x.com",
            "a@x..com",
            "joão@exemplo.com",
            "a@b.c",
            `${"l".repeat(65)}@x.com`,
        ];

        it("o servidor recusa lista de endereços, aspas, <>, ponto duplo e afins, sem enviar nada", async () => {
            for (const email of EVIL) {
                expect(await actions.requestCode({ email }), email).toBe("invalid-email");
            }
            await flush();
            expect(devMail).not.toHaveBeenCalled();
            expect(Number(admin("select count(*) from sign_in_codes"))).toBe(0);
            expect(Number(admin("select count(*) from rate_limit_buckets"))).toBe(0);
        });

        it("endereços normais passam, com maiúsculas e espaços nas pontas", async () => {
            for (const email of [
                " Ana.Silva+kinne@Exemplo.com.br ",
                "a_b-c@sub.dominio.co",
                "x@xn--e1afmkfd.xn--p1ai",
            ]) {
                resetLimits();
                expect(await actions.requestCode({ email }), email).toBe("sent");
            }
        });
    });

    // -----------------------------------------------------------------------------------------
    describe("B5. ids fora do tamanho do banco", () => {
        it("o navegador não leva id gigante ao entrar: recusado antes de gastar o código", async () => {
            const email = "gigante@ataque.test";
            const code = await codeFor(email);
            const huge = { ...NO_BROWSER, watched: [2 ** 40] };
            expect((await actions.verifyCode({ email, code, browser: huge })).kind).toBe("invalid");
            expect((await actions.verifyCode({ email, code, browser: NO_BROWSER })).kind).toBe(
                "ok",
            );
        });
    });
    // -----------------------------------------------------------------------------------------
    describe("A1 e M2. o teto diário não é de quem chega primeiro", () => {
        const today = () => new Date().toISOString().slice(0, 10);
        /** Esvazia o balde diário dos anônimos (e o único balde global da versão antiga). */
        const drainAnonymousPool = () => {
            for (const key of [`auth:day:${today()}`, `auth:day:anon:${today()}`]) {
                admin(
                    `insert into rate_limit_buckets (key, tokens, updated_at) values ('${key}', 0, now())
                     on conflict (key) do update set tokens = 0`,
                );
            }
        };

        it("um IP não pede mais de 15 códigos por dia, nem esperando o balde de 10 minutos", async () => {
            const answers: string[] = [];
            for (let i = 0; i < 18; i++) {
                admin("update rate_limit_buckets set tokens = 10 where key like 'auth:ip:req:%'");
                answers.push(await actions.requestCode({ email: `dia${i}@ataque.test` }));
            }
            expect(answers.filter((a) => a === "sent")).toHaveLength(15);
            expect(answers.slice(15)).toEqual(["limited", "limited", "limited"]);
            // outro IP não paga pelo primeiro
            requestHeaders = new Headers({ "x-real-ip": "198.51.100.77" });
            expect(await actions.requestCode({ email: "outro-ip@ataque.test" })).toBe("sent");
        });

        it("com o teto dos anônimos esgotado, quem tem sessão ainda recebe o código de apagar", async () => {
            await signUp("reserva@ataque.test");
            drainAnonymousPool();
            expect(await actions.requestCode({ email: "novo-dia@ataque.test" })).toBe("limited");
            devMail.mockClear();
            expect(await actions.requestDeleteCode()).toBe("sent");
            await flush();
            expect(devMail).toHaveBeenCalledOnce();
        });

        it("o teto soma menos que os 100 e-mails do plano gratuito", async () => {
            const { LIMITS } = await import("@/domain/accounts");
            expect(LIMITS.dailyAnonymous + LIMITS.dailyMembers).toBeLessThanOrEqual(100);
            expect(LIMITS.dailyMembers).toBeGreaterThan(0);
            expect(LIMITS.ipDaily.capacity).toBeLessThan(LIMITS.dailyAnonymous);
        });

        it("atingir o teto escreve um alerta no log, uma vez, sem e-mail, IP nem código", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            drainAnonymousPool();
            for (const email of ["alerta1@ataque.test", "alerta2@ataque.test"]) {
                expect(await actions.requestCode({ email })).toBe("limited");
            }
            expect(warn).toHaveBeenCalledTimes(1);
            const logged = JSON.stringify(warn.mock.calls);
            expect(logged).toMatch(/teto diário/i);
            expect(logged).not.toMatch(/@|ataque|203\.0\.113|\d{6}/);
        });

        it("quem esgota os pedidos de entrada de um e-mail não impede a pessoa de pedir o código de apagar (M2)", async () => {
            const email = "trava@ataque.test";
            await signUp(email);
            const owner = new Map(cookieJar);
            const ownerHeaders = requestHeaders;
            // um anônimo, de outro IP e outro navegador, gasta o balde por hora do e-mail
            cookieJar.clear();
            requestHeaders = new Headers({ "x-real-ip": "198.51.100.9" });
            for (let i = 0; i < 6; i++) {
                admin(
                    "update rate_limit_buckets set tokens = 1 where key like 'auth:email:cool:%'",
                );
                await actions.requestCode({ email });
            }
            admin("update rate_limit_buckets set tokens = 1 where key like 'auth:email:cool:%'");
            expect(await actions.requestCode({ email })).toBe("limited");
            // a pessoa, com a sessão dela
            cookieJar.clear();
            for (const [name, value] of owner) cookieJar.set(name, value);
            requestHeaders = ownerHeaders;
            expect(await actions.requestDeleteCode()).toBe("sent");
        });

        it("e quem pede muito o código de apagar não trava a entrada do mesmo e-mail (M2)", async () => {
            const email = "inunda@ataque.test";
            await signUp(email);
            for (let i = 0; i < 6; i++) {
                admin("update rate_limit_buckets set tokens = 1 where key like 'auth:del:cool:%'");
                admin(
                    "update rate_limit_buckets set tokens = 1 where key like 'auth:email:cool:%'",
                );
                await actions.requestDeleteCode();
            }
            cookieJar.clear();
            admin("update rate_limit_buckets set tokens = 1 where key like 'auth:email:cool:%'");
            expect(await actions.requestCode({ email })).toBe("sent");
        });
    });
    // -----------------------------------------------------------------------------------------
    describe("M5. sair só vale depois de o banco confirmar", () => {
        it("com o banco fora do ar, sair recusa e o cookie fica; com o banco de volta, sai", async () => {
            const { cookie } = await signUp("sair-falha@ataque.test");
            cookieWrites.length = 0;
            dbDown = true;
            expect(await actions.signOut()).toEqual({ ok: false });
            expect(cookieJar.get(COOKIE)).toBe(cookie);
            expect(cookieWrites.filter((w) => w.name === COOKIE)).toEqual([]);
            dbDown = false;
            expect((await actions.accountState()).signedIn).toBe(true);
            expect(await actions.signOut()).toEqual({ ok: true });
            expect(cookieJar.has(COOKIE)).toBe(false);
            expect((await actions.accountState()).signedIn).toBe(false);
        });

        it("o mesmo para sair de todos os aparelhos", async () => {
            const { cookie } = await signUp("sair-todos-falha@ataque.test");
            dbDown = true;
            expect(await actions.signOutAll()).toEqual({ ok: false });
            expect(cookieJar.get(COOKIE)).toBe(cookie);
            dbDown = false;
            expect((await actions.accountState()).signedIn).toBe(true);
            expect(await actions.signOutAll()).toEqual({ ok: true });
            expect(cookieJar.has(COOKIE)).toBe(false);
        });

        it("sem cookie ou com cookie de formato errado, sair é inofensivo e não depende do banco", async () => {
            dbDown = true;
            expect(await actions.signOut()).toEqual({ ok: true });
            cookieJar.set(COOKIE, "lixo");
            expect(await actions.signOut()).toEqual({ ok: true });
            expect(cookieJar.has(COOKIE)).toBe(false);
        });
    });
});
