import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { admin, dbTestsEnabled, localDb } from "@/test/local-pg";

// A sala de grupo lê o gosto, o "Já vi" e os streamings da conta pelo token da sessão (US015 C2,
// RNE003). Ataque: um membro com sessão manda listas forjadas ao criar, entrar ou mudar as
// preferências, e o resultado da sala (que sai do que está gravado por membro) não pode mudar.
// Contra um PostgreSQL de verdade, chamando as ações de verdade.

const cookieJar = new Map<string, string>();
let requestHeaders = new Headers();
const afterTasks: (() => Promise<void>)[] = [];

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name) } : undefined),
        set: (name: string, value: string, options: Record<string, unknown> = {}) => {
            if (options.maxAge === 0 || value === "") cookieJar.delete(name);
            else cookieJar.set(name, value);
        },
        delete: (arg: string | { name: string }) =>
            cookieJar.delete(typeof arg === "string" ? arg : arg.name),
    }),
    headers: async () => requestHeaders,
}));
vi.mock("next/server", () => ({
    after: (task: () => Promise<void>) => {
        afterTasks.push(task);
    },
}));
vi.mock("@/infrastructure/db/client", () => ({ createDb: () => localDb() }));
vi.mock("../_data/candidates", () => ({ candidates: async () => [] }));
vi.mock("../_data/taste-graph", () => ({ neighborGraphOrNull: async () => null }));
vi.mock("../_data/feelings", () => ({ loadFeelingKit: async () => null }));

const SESSION = "__Host-kinne_session";
const CHALLENGE = "__Host-kinne_challenge";
const ROOM = "kinne_room";
const TITLES = Array.from({ length: 12 }, (_, i) => 9301 + i);
const devMail = vi.fn();

let ip = 0;
let actions: typeof import("./account");
let room: typeof import("./room");

type Browser = {
    streamings: string[];
    watched: number[];
    taste: { liked: number[]; willWatch: number[]; disliked: number[] };
};
const EMPTY: Browser = {
    streamings: [],
    watched: [],
    taste: { liked: [], willWatch: [], disliked: [] },
};

// o que o atacante manda no corpo, tudo diferente do que a conta guarda
const FORGED = {
    streamings: ["netflix", "globoplay"],
    genres: ["action"],
    watched: [9399, 9398],
    taste: { liked: [9397], willWatch: [9396], disliked: [9395] },
};

/** Cada "navegador" tem o seu pote de cookies. */
const jars = new Map<string, Map<string, string>>();
function browser(name: string) {
    cookieJar.clear();
    for (const [k, v] of jars.get(name) ?? []) cookieJar.set(k, v);
}
function park(name: string) {
    jars.set(name, new Map(cookieJar));
}

const flush = async () => {
    await Promise.all(afterTasks.splice(0).map((task) => task()));
};
const resetLimits = () => admin("delete from rate_limit_buckets");

async function signUp(name: string, email: string, data: Browser) {
    cookieJar.clear();
    resetLimits();
    expect(await actions.requestCode({ email })).toBe("sent");
    await flush();
    const text = String(devMail.mock.calls.at(-1)?.[0] ?? "");
    const match = /(\d{3}) (\d{3})/.exec(text)!;
    const answer = await actions.verifyCode({
        email,
        code: `${match[1]}${match[2]}`,
        browser: data,
    });
    expect(answer.kind).toBe("ok");
    cookieJar.delete(CHALLENGE);
    park(name);
}

type Row = {
    position: number;
    streamings: string[];
    genres: string[];
    watched_ids: number[];
    liked_ids: number[];
    will_watch_ids: number[];
    disliked_ids: number[];
    ready: boolean;
};
const members = (): Row[] =>
    JSON.parse(
        admin("select coalesce(json_agg(m order by position), '[]') from group_room_members m"),
    );
const sorted = (list: number[]) => [...list].sort((a, b) => a - b);

describe.skipIf(!dbTestsEnabled)(
    "a sala lê a conta, não o corpo do pedido (US015 C2, RNE003)",
    () => {
        beforeAll(() => {
            for (const id of TITLES) {
                admin(`insert into catalog_titles (id, tmdb_id, title_type, slug, display_title, original_title,
                tmdb_average_rating, tmdb_vote_count, last_synced_at, is_recommendable)
                values (${id}, ${id}, 'movie', 'sala-conta-${id}', 'Título ${id}', 'Title ${id}', 7.5, 1000, now(), true)
                on conflict (id) do nothing`);
            }
        });
        afterAll(() => {
            admin("delete from group_rooms");
            admin("delete from users where email like '%@sala.test'");
            admin("delete from sign_in_codes");
            admin("delete from catalog_titles where id between 9301 and 9312");
        });

        beforeEach(async () => {
            admin("delete from group_rooms");
            admin("delete from users where email like '%@sala.test'");
            admin("delete from sign_in_codes");
            admin("delete from rate_limit_buckets");
            cookieJar.clear();
            jars.clear();
            afterTasks.length = 0;
            devMail.mockReset();
            ip++;
            requestHeaders = new Headers({ "x-real-ip": `203.0.113.${ip % 250}` });
            vi.stubEnv("VERCEL", "1");
            vi.stubEnv("AUTH_SECRET", "a".repeat(48));
            vi.stubEnv("RATE_LIMIT_SECRET", "r".repeat(48));
            vi.stubEnv("NODE_ENV", "development");
            vi.stubEnv("RESEND_API_KEY", "");
            vi.stubEnv("VERCEL_ENV", "");
            vi.spyOn(console, "info").mockImplementation(devMail);
            vi.resetModules();
            actions = await import("./account");
            room = await import("./room");
        });
        afterEach(() => {
            vi.unstubAllEnvs();
            vi.restoreAllMocks();
        });

        const create = (name: string, member: unknown) => {
            browser(name);
            resetLimits();
            return room.createRoom({ browserId: crypto.randomUUID(), member }).then((answer) => {
                park(name);
                return answer;
            });
        };
        const join = async (name: string, member: unknown) => {
            browser(name);
            resetLimits();
            const code = admin("select code from group_rooms limit 1");
            const answer = await room.joinRoom({ code, member });
            park(name);
            return answer;
        };

        it("quem tem sessão cria e entra com as listas da conta; as do corpo do pedido são ignoradas", async () => {
            await signUp("ana", "ana@sala.test", {
                streamings: ["max"],
                watched: [9301, 9302],
                taste: { liked: [9303], willWatch: [9304], disliked: [9305] },
            });
            await signUp("bia", "bia@sala.test", {
                streamings: ["prime-video", "disney-plus"],
                watched: [9306],
                taste: { liked: [9307, 9308], willWatch: [], disliked: [9309] },
            });
            expect(await create("ana", FORGED)).toEqual({ ok: true });
            expect(await join("bia", FORGED)).toEqual({ ok: true });
            const [ana, bia] = members();
            expect(ana.streamings).toEqual(["max"]);
            expect(sorted(ana.watched_ids)).toEqual([9301, 9302]);
            expect(ana.liked_ids).toEqual([9303]);
            expect(ana.will_watch_ids).toEqual([9304]);
            expect(ana.disliked_ids).toEqual([9305]);
            expect([...bia.streamings].sort()).toEqual(["disney-plus", "prime-video"]);
            expect(bia.watched_ids).toEqual([9306]);
            expect(sorted(bia.liked_ids)).toEqual([9307, 9308]);
            expect(bia.disliked_ids).toEqual([9309]);
            // os gêneros são uma escolha da sala, não da conta: seguem o pedido
            expect(ana.genres).toEqual(["action"]);
            expect(bia.genres).toEqual(["action"]);
            // nada do que foi forjado chegou ao banco
            const all = JSON.stringify(members());
            for (const forged of ["netflix", "globoplay", "9399", "9398", "9397", "9396", "9395"]) {
                expect(all).not.toContain(forged);
            }
        });

        it("conta sem nada guardado e listas forjadas no corpo: a sala fica com o vazio da conta", async () => {
            await signUp("vazia", "vazia@sala.test", EMPTY);
            await signUp("outra", "outra@sala.test", EMPTY);
            expect(await create("vazia", FORGED)).toEqual({ ok: true });
            expect(await join("outra", FORGED)).toEqual({ ok: true });
            for (const m of members()) {
                expect(m.streamings).toEqual([]);
                expect(m.watched_ids).toEqual([]);
                expect(m.liked_ids).toEqual([]);
                expect(m.will_watch_ids).toEqual([]);
                expect(m.disliked_ids).toEqual([]);
            }
        });

        it("mudar as preferências na sala não troca os streamings da conta", async () => {
            await signUp("ana", "ana-pref@sala.test", { ...EMPTY, streamings: ["max"] });
            expect(await create("ana", FORGED)).toEqual({ ok: true });
            browser("ana");
            const answer = await room.updatePreferences({
                streamings: ["disney-plus", "netflix"],
                genres: ["drama"],
                ready: true,
                settings: null,
            });
            expect(answer).toEqual({ ok: true });
            const [me] = members();
            expect(me.streamings).toEqual(["max"]);
            expect(me.genres).toEqual(["drama"]);
            expect(me.ready).toBe(true);
        });

        it("sem sessão a sala segue como antes: valem as listas do navegador", async () => {
            await signUp("ana", "ana-visitante@sala.test", { ...EMPTY, streamings: ["max"] });
            expect(await create("ana", FORGED)).toEqual({ ok: true });
            // um visitante, sem cookie de sessão
            cookieJar.clear();
            park("visitante");
            expect(await join("visitante", FORGED)).toEqual({ ok: true });
            const visitor = members()[1];
            expect(visitor.streamings).toEqual(["netflix", "globoplay"]);
            expect(sorted(visitor.watched_ids)).toEqual([9398, 9399]);
            expect(visitor.liked_ids).toEqual([9397]);
            expect(visitor.disliked_ids).toEqual([9395]);
            browser("visitante");
            expect(
                await room.updatePreferences({
                    streamings: ["disney-plus"],
                    genres: [],
                    ready: false,
                    settings: null,
                }),
            ).toEqual({ ok: true });
            expect(members()[1].streamings).toEqual(["disney-plus"]);
        });

        it("com o cookie de sessão de outra pessoa na sala não se herda nada: a identidade é só o cookie", async () => {
            await signUp("ana", "ana-id@sala.test", {
                ...EMPTY,
                streamings: ["max"],
                watched: [9301],
            });
            await signUp("bia", "bia-id@sala.test", { ...EMPTY, streamings: ["globoplay"] });
            expect(await create("ana", FORGED)).toEqual({ ok: true });
            // um cookie de sessão inventado vale como visitante
            cookieJar.clear();
            cookieJar.set(SESSION, "x".repeat(43));
            park("falso");
            expect(await join("falso", FORGED)).toEqual({ ok: true });
            expect(members()[1].streamings).toEqual(["netflix", "globoplay"]);
            // e o cookie de sala de Ana, na mão de Bia, não muda os dados de Ana
            cookieJar.clear();
            cookieJar.set(SESSION, jars.get("bia")!.get(SESSION)!);
            cookieJar.set(ROOM, jars.get("ana")!.get(ROOM)!);
            await room.updatePreferences({
                streamings: [],
                genres: [],
                ready: true,
                settings: null,
            });
            expect(members()[0].streamings).not.toEqual(["max"]);
        });
    },
);
