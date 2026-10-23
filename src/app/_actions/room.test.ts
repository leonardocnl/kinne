import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROOM_TTL_MS } from "@/domain/group-room";

const store = new Map<string, string>();
const setCookie = vi.fn((name: string, value: string, options: Record<string, unknown>) => {
    store.set(name, value);
    return options;
});
const deleteCookie = vi.fn();
let requestHeaders = new Headers({ "x-real-ip": "203.0.113.7" });
vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined),
        set: setCookie,
        delete: deleteCookie,
    }),
    headers: async () => requestHeaders,
}));

const takeTokens = vi.fn();
vi.mock("@/infrastructure/db/rate-limiter", () => ({ takeTokens }));
vi.mock("@/infrastructure/db/client", () => ({ createDb: () => ({}) }));
vi.mock("../_data/candidates", () => ({ candidates: async () => [] }));
vi.mock("../_data/taste-graph", () => ({ neighborGraphOrNull: async () => null }));

const repository = {
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    purge: vi.fn(),
    snapshot: vi.fn(),
    proposalInput: vi.fn(),
    tallies: vi.fn(),
    updatePreferences: vi.fn(),
    updateSettings: vi.fn(),
    startVoting: vi.fn(),
    nextRound: vi.fn(),
    castVote: vi.fn(),
    closeVoting: vi.fn(),
    closeIfEveryoneVoted: vi.fn(),
};
vi.mock("@/infrastructure/db/group-room-repository", () => ({
    DrizzleGroupRoomRepository: class {
        constructor() {
            return repository;
        }
    },
}));

const BROWSER_ID = "0b7c5a52-3f0e-4c1e-9d55-8f1a3c2b6e71";
const taste = { liked: [], willWatch: [], disliked: [] };
const member = { streamings: ["netflix"], genres: [], watched: [1, 2], taste };
const goodCookie = "a".repeat(43);

beforeEach(() => {
    vi.resetModules();
    store.clear();
    setCookie.mockClear();
    deleteCookie.mockClear();
    for (const fn of Object.values(repository)) fn.mockReset();
    takeTokens.mockReset().mockResolvedValue("ok");
    requestHeaders = new Headers({ "x-real-ip": "203.0.113.7" });
    process.env.VERCEL = "1";
    process.env.RATE_LIMIT_SECRET = "s".repeat(40);
});

describe("createRoom (C2)", () => {
    it("cria a sala e entrega o cookie de membro: HttpOnly, Secure, Lax, só sob /sala, até a sala expirar (A2)", async () => {
        repository.create.mockResolvedValue({ kind: "created" });
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: true });

        const [name, value, options] = setCookie.mock.calls[0];
        expect(name).toBe("kinne_room");
        // 32 bytes aleatórios em base64url
        expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(options).toMatchObject({
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/sala",
        });
        const lifetime = (options.expires as Date).getTime() - Date.now();
        expect(lifetime).toBeGreaterThan(ROOM_TTL_MS - 5_000);
        expect(lifetime).toBeLessThanOrEqual(ROOM_TTL_MS);
    });

    it("o banco recebe só o hash do cookie, nunca o cookie (A2)", async () => {
        repository.create.mockResolvedValue({ kind: "created" });
        const { createRoom } = await import("./room");
        await createRoom({ browserId: BROWSER_ID, member });
        const cookie = setCookie.mock.calls[0][1];
        const sent = repository.create.mock.calls[0][0];
        expect(sent.tokenHash).toMatch(/^[0-9a-f]{64}$/);
        expect(JSON.stringify(sent)).not.toContain(cookie);
        // o código do navegador também não vai em claro: só o HMAC dele
        expect(JSON.stringify(sent)).not.toContain(BROWSER_ID);
        expect(sent.code).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    });

    it("sorteia outro código se o primeiro já existe, e desiste depois de três", async () => {
        repository.create
            .mockResolvedValueOnce({ kind: "code-taken" })
            .mockResolvedValueOnce({ kind: "created" });
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: true });
        expect(repository.create).toHaveBeenCalledTimes(2);
        repository.create.mockReset().mockResolvedValue({ kind: "code-taken" });
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: false });
        expect(repository.create).toHaveBeenCalledTimes(3);
    });

    it("D1: com 3 salas na última hora, recusa e não entrega cookie", async () => {
        repository.create.mockResolvedValue({ kind: "limited" });
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: false });
        expect(setCookie).not.toHaveBeenCalled();
    });

    it("D1: o limite por IP recusa antes do banco", async () => {
        takeTokens.mockResolvedValue("limited");
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: false });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("sem o segredo do limitador, nada se cria (falha fechada)", async () => {
        delete process.env.RATE_LIMIT_SECRET;
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: false });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it("sem resposta do limitador, recusa (falha fechada)", async () => {
        takeTokens.mockRejectedValue(new Error("banco fora"));
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member })).toEqual({ ok: false });
    });
});

describe("joinRoom (C3, C4, A1, A4, RNE003)", () => {
    it("entra com o código com ou sem hífen e em qualquer caixa", async () => {
        repository.join.mockResolvedValue(true);
        const { joinRoom } = await import("./room");
        expect(await joinRoom({ code: "abcd-2345", member })).toEqual({ ok: true });
        expect(repository.join.mock.calls[0][0].code).toBe("ABCD2345");
        expect(setCookie).toHaveBeenCalledOnce();
    });

    it("com o cookie de uma sala viva, volta a ela sem criar entrada nova (RNE002)", async () => {
        store.set("kinne_room", goodCookie);
        repository.snapshot.mockResolvedValue({
            room: { expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
        });
        const { joinRoom } = await import("./room");
        expect(await joinRoom({ code: "abcd-2345", member })).toEqual({ ok: true });
        expect(repository.join).not.toHaveBeenCalled();
        // o cookie continua o mesmo: nada é regravado
        expect(setCookie).not.toHaveBeenCalled();
        expect(repository.snapshot.mock.calls[0][0]).toMatch(/^[0-9a-f]{64}$/);
    });

    it("com o cookie de uma sala que terminou ou venceu, entra normalmente", async () => {
        store.set("kinne_room", goodCookie);
        repository.join.mockResolvedValue(true);
        const { joinRoom } = await import("./room");
        repository.snapshot.mockResolvedValue(null);
        expect(await joinRoom({ code: "ABCD2345", member })).toEqual({ ok: true });
        repository.snapshot.mockResolvedValue({
            room: { expiresAt: new Date(Date.now() - 1000).toISOString() },
        });
        expect(await joinRoom({ code: "ABCD2345", member })).toEqual({ ok: true });
        expect(repository.join).toHaveBeenCalledTimes(2);
        expect(setCookie).toHaveBeenCalledTimes(2);
    });

    it("código malformado continua recusado mesmo com o cookie de uma sala viva", async () => {
        store.set("kinne_room", goodCookie);
        repository.snapshot.mockResolvedValue({
            room: { expiresAt: new Date(Date.now() + 3_600_000).toISOString() },
        });
        const { joinRoom } = await import("./room");
        expect(await joinRoom({ code: "lixo", member })).toEqual({ ok: false });
    });

    it("a mesma resposta para código inexistente, vencido, cheio ou começado (RNE003)", async () => {
        const { joinRoom } = await import("./room");
        repository.join.mockResolvedValue(false);
        const refusedByDatabase = await joinRoom({ code: "ABCD2345", member });
        const malformed = await joinRoom({ code: "não é código", member });
        const forged = await joinRoom({ code: "ABCD2345", member, extra: 1 });
        expect(refusedByDatabase).toEqual({ ok: false });
        expect(malformed).toEqual(refusedByDatabase);
        expect(forged).toEqual(refusedByDatabase);
        expect(setCookie).not.toHaveBeenCalled();
    });

    it("A1: toda tentativa gasta uma ficha do IP, certa ou errada, e sem ficha não chega ao banco", async () => {
        repository.join.mockResolvedValue(false);
        const { joinRoom } = await import("./room");
        await joinRoom({ code: "ZZZZZZZZ", member });
        await joinRoom({ code: "lixo", member });
        expect(takeTokens).toHaveBeenCalledTimes(2);
        const [, buckets] = takeTokens.mock.calls[0];
        expect(buckets[0][0]).toMatch(/^room:join:/);
        // 10 tentativas por 10 minutos
        expect(buckets[0][1]).toBe(10);
        expect(buckets[0][2]).toBeCloseTo(10 / 600);
        repository.join.mockClear();
        takeTokens.mockResolvedValue("limited");
        expect(await joinRoom({ code: "ABCD2345", member })).toEqual({ ok: false });
        expect(repository.join).not.toHaveBeenCalled();
    });

    it("o balde do IP não guarda o IP em claro", async () => {
        const { joinRoom } = await import("./room");
        await joinRoom({ code: "ABCD2345", member });
        expect(JSON.stringify(takeTokens.mock.calls)).not.toContain("203.0.113.7");
    });
});

describe("entrada estrita (B2, B3)", () => {
    it.each([
        ["streaming desconhecido", { ...member, streamings: ["hbo"] }],
        ["streaming repetido", { ...member, streamings: ["netflix", "netflix"] }],
        ["gênero desconhecido", { ...member, genres: ["terror"] }],
        ["chave desconhecida", { ...member, nome: "Ana" }],
        [
            "Já vi com 1001 ids",
            { ...member, watched: Array.from({ length: 1001 }, (_, i) => i + 1) },
        ],
        [
            "gosto com 201 ids",
            { ...member, taste: { ...taste, liked: Array.from({ length: 201 }, (_, i) => i + 1) } },
        ],
        ["gosto sem uma lista", { ...member, taste: { liked: [], willWatch: [] } }],
        ["sem o gosto", { streamings: [], genres: [], watched: [] }],
    ])("recusa %s ao criar e ao entrar", async (_, bad) => {
        const { createRoom, joinRoom } = await import("./room");
        expect(await createRoom({ browserId: BROWSER_ID, member: bad })).toEqual({ ok: false });
        expect(await joinRoom({ code: "ABCD2345", member: bad })).toEqual({ ok: false });
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.join).not.toHaveBeenCalled();
    });

    it("recusa código do navegador que não é uuid", async () => {
        const { createRoom } = await import("./room");
        expect(await createRoom({ browserId: "abc", member })).toEqual({ ok: false });
    });

    it("preferências: chaves desconhecidas, duração fora da lista e tipo desconhecido são recusados", async () => {
        store.set("kinne_room", goodCookie);
        repository.updatePreferences.mockResolvedValue(true);
        const { updatePreferences } = await import("./room");
        const base = { streamings: [], genres: [], ready: true, settings: null };
        expect(await updatePreferences(base)).toEqual({ ok: true });
        for (const bad of [
            { ...base, x: 1 },
            { ...base, ready: "sim" },
            { ...base, settings: { typeChoice: "both", maxRuntime: 100 } },
            { ...base, settings: { typeChoice: "anime", maxRuntime: null } },
            { ...base, settings: { typeChoice: "both", maxRuntime: null, extra: 1 } },
            { ...base, streamings: ["hbo"] },
        ]) {
            expect(await updatePreferences(bad)).toEqual({ ok: false });
        }
    });

    it("voto: no máximo 5 ids, sem repetição, só inteiros positivos", async () => {
        store.set("kinne_room", goodCookie);
        repository.castVote.mockResolvedValue(true);
        repository.closeIfEveryoneVoted.mockResolvedValue(false);
        const { vote } = await import("./room");
        expect(await vote({ titleIds: [1, 2] })).toEqual({ ok: true });
        for (const bad of [
            { titleIds: [1, 2, 3, 4, 5, 6] },
            { titleIds: [1, 1] },
            { titleIds: [0] },
            { titleIds: [-3] },
            { titleIds: ["1"] },
            { titleIds: [1], memberId: 3 },
        ]) {
            expect(await vote(bad)).toEqual({ ok: false });
        }
    });
});

describe("quem pede é achado pelo cookie, nunca por um id do corpo (A2, A3)", () => {
    it("sem cookie, ou com cookie fora do formato, tudo é recusado", async () => {
        const actions = await import("./room");
        for (const cookie of [undefined, "curto", "a".repeat(44), "!".repeat(43)]) {
            store.clear();
            if (cookie) store.set("kinne_room", cookie);
            expect(await actions.startRoom()).toEqual({ ok: false, reason: "refused" });
            expect(await actions.nextRound()).toEqual({ ok: false, reason: "refused" });
            expect(await actions.closeVoting()).toEqual({ ok: false });
            expect(await actions.vote({ titleIds: [1] })).toEqual({ ok: false });
            expect(
                await actions.updatePreferences({
                    streamings: [],
                    genres: [],
                    ready: true,
                    settings: null,
                }),
            ).toEqual({ ok: false });
            expect(await actions.roomState()).toEqual({ kind: "none" });
        }
        for (const fn of Object.values(repository)) expect(fn).not.toHaveBeenCalled();
    });

    it("o banco recebe o hash do cookie, e o cookie em claro nunca", async () => {
        store.set("kinne_room", goodCookie);
        repository.closeVoting.mockResolvedValue(true);
        const { closeVoting } = await import("./room");
        await closeVoting();
        const sent = repository.closeVoting.mock.calls[0][0];
        expect(sent).toMatch(/^[0-9a-f]{64}$/);
        expect(sent).not.toContain(goodCookie);
    });

    it("A3: quem não criou é recusado em cada ação de quem criou", async () => {
        store.set("kinne_room", goodCookie);
        // o banco só confere o criador e não troca nada: proposalInput vazio e CAS sem linha
        repository.proposalInput.mockResolvedValue(null);
        repository.closeVoting.mockResolvedValue(false);
        repository.updateSettings.mockResolvedValue(false);
        const actions = await import("./room");
        expect(await actions.startRoom()).toEqual({ ok: false, reason: "refused" });
        expect(await actions.nextRound()).toEqual({ ok: false, reason: "refused" });
        expect(await actions.closeVoting()).toEqual({ ok: false });
        const settings = { typeChoice: "movie", maxRuntime: 105 };
        expect(
            await actions.updatePreferences({ streamings: [], genres: [], ready: true, settings }),
        ).toEqual({ ok: false });
        // recusado o tipo, as preferências nem são gravadas
        expect(repository.updatePreferences).not.toHaveBeenCalled();
        expect(repository.startVoting).not.toHaveBeenCalled();
        expect(repository.nextRound).not.toHaveBeenCalled();
    });

    it("voto que o banco recusa (não é finalista, fase errada) não fecha a votação", async () => {
        store.set("kinne_room", goodCookie);
        repository.castVote.mockResolvedValue(false);
        const { vote } = await import("./room");
        expect(await vote({ titleIds: [99] })).toEqual({ ok: false });
        expect(repository.closeIfEveryoneVoted).not.toHaveBeenCalled();
    });

    it("o último voto fecha a votação (C8)", async () => {
        store.set("kinne_room", goodCookie);
        repository.castVote.mockResolvedValue(true);
        repository.closeIfEveryoneVoted.mockResolvedValue(true);
        const { vote } = await import("./room");
        expect(await vote({ titleIds: [1] })).toEqual({ ok: true });
        expect(repository.closeIfEveryoneVoted).toHaveBeenCalledOnce();
    });
});

describe("sair e estado (C10, D2)", () => {
    it("sair apaga o cookie e pede a saída ao banco", async () => {
        store.set("kinne_room", goodCookie);
        repository.leave.mockResolvedValue("left");
        const { leaveRoom } = await import("./room");
        expect(await leaveRoom()).toEqual({ ok: true });
        expect(deleteCookie).toHaveBeenCalledWith({ name: "kinne_room", path: "/sala" });
        expect(repository.leave.mock.calls[0][0]).toMatch(/^[0-9a-f]{64}$/);
    });

    it("sair sem cookie é inofensivo", async () => {
        const { leaveRoom } = await import("./room");
        expect(await leaveRoom()).toEqual({ ok: true });
        expect(repository.leave).not.toHaveBeenCalled();
    });

    it("D2: a leitura do estado tem limite por cookie e responde 'limited', não 'ended'", async () => {
        store.set("kinne_room", goodCookie);
        repository.snapshot.mockResolvedValue(null);
        const { roomState } = await import("./room");
        let limited = 0;
        for (let i = 0; i < 100; i++) {
            const answer = await roomState();
            if (answer.kind === "limited") limited++;
        }
        expect(limited).toBeGreaterThan(0);
        expect(limited).toBeLessThan(100);
    });
});

describe("o que fica fora do log e do endereço (C1, E1)", () => {
    it("as ações da sala não escrevem console nem montam query string", () => {
        for (const file of [
            "src/app/_actions/room.ts",
            "src/app/_data/room.ts",
            "src/application/group-room.ts",
            "src/infrastructure/db/group-room-repository.ts",
            "src/infrastructure/group-room-session.ts",
        ]) {
            const text = readFileSync(file, "utf8");
            expect(text, file).not.toMatch(/console\./);
            expect(text, file).not.toMatch(/searchParams|URLSearchParams/);
        }
    });
});
