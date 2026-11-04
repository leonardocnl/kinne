import { beforeEach, describe, expect, it, vi } from "vitest";
import { declineStreaming } from "./StreamingQuestion";

const { load, save, setStatus, saveInBrowser, saved } = vi.hoisted(() => ({
    load: vi.fn(),
    save: vi.fn(),
    setStatus: vi.fn(),
    saveInBrowser: vi.fn(),
    saved: vi.fn(),
}));

vi.mock("../../_actions/account", () => ({ saveStreamings: save }));
vi.mock("../account/store", () => ({
    loadAccountStatus: load,
    setAccountStatus: setStatus,
    useAccountStatus: () => ({ state: "unknown" }),
}));
vi.mock("@/infrastructure/browser-storage", () => ({
    savedStreamings: saved,
    saveStreamingsInBrowser: saveInBrowser,
    setRunStreamings: vi.fn(),
    streamingAnswers: { read: () => [], add: vi.fn() },
    subscribeToStreamings: () => () => {},
}));

describe("declineStreaming (US018 C5)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        save.mockResolvedValue({ ok: true });
    });

    it("com a conta ainda carregando, parte da lista da conta, não da do navegador", async () => {
        // com conta, o navegador não guarda lista: a leitura dele durante o carregamento é vazia
        saved.mockReturnValue([]);
        let finishLoading = (_: unknown) => {};
        load.mockReturnValue(new Promise((resolve) => (finishLoading = resolve)));

        const answer = declineStreaming("max");
        expect(save).not.toHaveBeenCalled();
        finishLoading({
            state: "account",
            account: { streamings: ["netflix", "max", "globoplay"] },
        });

        await expect(answer).resolves.toEqual(["netflix", "globoplay"]);
        expect(save).toHaveBeenCalledExactlyOnceWith({ streamings: ["netflix", "globoplay"] });
        expect(saveInBrowser).not.toHaveBeenCalled();
    });

    it("se a conta recusar, não atualiza a tela e avisa com null", async () => {
        load.mockResolvedValue({ state: "account", account: { streamings: ["netflix", "max"] } });
        save.mockResolvedValue({ ok: false });
        await expect(declineStreaming("max")).resolves.toBeNull();
        expect(setStatus).not.toHaveBeenCalled();
    });

    it("visitante grava no navegador e não chama o servidor", async () => {
        load.mockResolvedValue({ state: "visitor" });
        saved.mockReturnValue([]);
        await declineStreaming("netflix");
        expect(saveInBrowser).toHaveBeenCalledExactlyOnceWith([
            "max",
            "prime-video",
            "disney-plus",
            "globoplay",
        ]);
        expect(save).not.toHaveBeenCalled();
    });
});
