import { beforeEach, describe, expect, it, vi } from "vitest";

// security.md §7: o "Me surpreenda" e os eventos têm limite por visitante
const admitDraw = vi.fn();
const admitEvent = vi.fn();
const candidates = vi.fn();
const after = vi.fn();
vi.mock("../_data/draw-limit", () => ({ admitDraw, admitEvent }));
vi.mock("../_data/candidates", () => ({ candidates }));
vi.mock("../_data/account", () => ({ drawAccount: vi.fn().mockResolvedValue(null) }));
vi.mock("../_data/taste-graph", () => ({ neighborGraphOrNull: vi.fn() }));
vi.mock("next/server", () => ({ after }));

beforeEach(() => {
    admitDraw.mockReset();
    admitEvent.mockReset();
    candidates.mockReset().mockResolvedValue([]);
    after.mockReset();
});

const SURPRISE = {
    streamings: [],
    watched: [],
    shown: [],
    taste: { liked: [], willWatch: [], disliked: [] },
};

describe("limites (security.md §7)", () => {
    it("o Me surpreenda passado o limite responde limitado, antes de consultar o catálogo", async () => {
        admitDraw.mockResolvedValue(false);
        const { surprise } = await import("./surprise");
        expect(await surprise(SURPRISE)).toEqual({ kind: "limited" });
        expect(candidates).not.toHaveBeenCalled();
    });

    it("dentro do limite, sorteia como sempre", async () => {
        admitDraw.mockResolvedValue(true);
        const { surprise } = await import("./surprise");
        expect(await surprise(SURPRISE)).toBeNull();
        expect(candidates).toHaveBeenCalled();
    });

    it("o evento passado o limite cai calado, sem gravar", async () => {
        admitEvent.mockResolvedValue(false);
        const { recordEvent } = await import("./events");
        await expect(recordEvent({ name: "x" })).resolves.toBeUndefined();
        expect(after).not.toHaveBeenCalled();
    });
});
