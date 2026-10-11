import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordEvent = vi.fn<(input: unknown) => Promise<void>>();
// sem o vi.fn no caminho: ele mesmo trata a promessa devolvida, para guardar o resultado
let send: ((input: unknown) => Promise<void>) | null = null;
const storage = { team: false, id: "0b7c5a52-3f0e-4c1e-9d55-8f1a3c2b6e71" as string | Error };

vi.mock("../_actions/events", () => ({
    recordEvent: (input: unknown) => (send ? send(input) : recordEvent(input)),
}));
vi.mock("@/infrastructure/browser-storage", () => ({
    teamBrowser: { is: () => storage.team },
    browserId: () => {
        if (storage.id instanceof Error) throw storage.id;
        return storage.id;
    },
}));

const { track } = await import("./measure");

beforeEach(() => {
    recordEvent.mockReset().mockResolvedValue(undefined);
    send = null;
    storage.team = false;
    storage.id = "0b7c5a52-3f0e-4c1e-9d55-8f1a3c2b6e71";
});

afterEach(() => vi.restoreAllMocks());

describe("track", () => {
    it("envia o evento com o código do navegador", () => {
        track("recommendation_shown", { source: "filtered", titleId: 7 });
        expect(recordEvent).toHaveBeenCalledWith({
            browserId: storage.id,
            name: "recommendation_shown",
            source: "filtered",
            titleId: 7,
        });
    });

    it("não envia nada do navegador da equipe (US006 C2)", () => {
        storage.team = true;
        track("app_opened");
        expect(recordEvent).not.toHaveBeenCalled();
    });

    it("trata a falha do envio, sem rejeição solta", async () => {
        // a promessa rejeitada precisa de quem a trate; sem isso, vira erro solto na página
        let handled = false;
        send = () => {
            const failed = Promise.reject(new Error("Failed to fetch"));
            const then = failed.then.bind(failed);
            failed.then = ((ok, fail) => {
                handled ||= typeof fail === "function";
                return then(ok, fail);
            }) as typeof failed.then;
            failed.catch(() => {}); // só para o teste não deixar rejeição solta
            handled = false;
            return failed;
        };
        expect(() => track("already_watched_clicked", { titleId: 7 })).not.toThrow();
        expect(handled).toBe(true);
    });

    it("não lança quando o envio falha na hora ou não há como criar o código", () => {
        recordEvent.mockImplementation(() => {
            throw new Error("action indisponível");
        });
        expect(() => track("trailer_opened", { titleId: 7 })).not.toThrow();
        storage.id = new Error("crypto.randomUUID indisponível");
        expect(() => track("app_opened")).not.toThrow();
    });
});
