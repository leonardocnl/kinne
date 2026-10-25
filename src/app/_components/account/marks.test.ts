import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sair (US012 C7, US015 RNE004; revisão M5 e B1): o navegador só se limpa depois de o servidor
// confirmar, e a limpeza leva também o que a conta deixou na aba.
vi.mock("../../_actions/account", () => ({
    accountState: vi.fn(async () => ({ signedIn: false })),
    setSignal: vi.fn(),
    setWatched: vi.fn(),
    signOut: vi.fn(async () => ({ ok: true })),
}));

function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
        clear: () => data.clear(),
        key: (i) => [...data.keys()][i] ?? null,
        get length() {
            return data.size;
        },
    };
}

const LOCAL = ["kinne:taste", "kinne:watched", "kinne:streamings"];
const TAB = ["kinne:filters", "kinne:filtered-run", "kinne:shown"];

let local: Storage;
let tab: Storage;

beforeEach(() => {
    local = memoryStorage();
    tab = memoryStorage();
    vi.stubGlobal("window", { localStorage: local, sessionStorage: tab });
    for (const key of [...LOCAL, "kinne:browser-id"]) local.setItem(key, JSON.stringify([1]));
    for (const key of TAB) tab.setItem(key, JSON.stringify({ feeling: "x", watched: [1, 2] }));
});
afterEach(() => vi.unstubAllGlobals());

describe("leaveAccount", () => {
    it("com o servidor confirmando, apaga o gosto, o já vi, os streamings e o que ficou na aba", async () => {
        const { leaveAccount } = await import("./marks");
        expect(await leaveAccount(async () => ({ ok: true }))).toBe(true);
        for (const key of LOCAL) expect(local.getItem(key), key).toBeNull();
        for (const key of TAB) expect(tab.getItem(key), key).toBeNull();
        // o código anônimo do navegador não é da conta
        expect(local.getItem("kinne:browser-id")).not.toBeNull();
    });

    it.each([
        ["recusa", async () => ({ ok: false })],
        [
            "erro",
            async () => {
                throw new Error("rede");
            },
        ],
    ])("se o servidor dá %s, nada é apagado e a tela sabe que não saiu", async (_, answer) => {
        const { leaveAccount } = await import("./marks");
        expect(await leaveAccount(answer)).toBe(false);
        for (const key of LOCAL) expect(local.getItem(key), key).not.toBeNull();
        for (const key of TAB) expect(tab.getItem(key), key).not.toBeNull();
    });
});

describe("afterAccountDeleted", () => {
    it("apaga o mesmo que sair, sem perguntar ao servidor", async () => {
        const { afterAccountDeleted } = await import("./marks");
        afterAccountDeleted();
        for (const key of [...LOCAL, ...TAB])
            expect(local.getItem(key) ?? tab.getItem(key), key).toBeNull();
    });
});
