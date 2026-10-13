import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS, wireFilters } from "@/domain/filters";

const candidates = vi.fn();
const personTitleIds = vi.fn();
vi.mock("../_data/candidates", () => ({ candidates }));
const admit = vi.fn();
vi.mock("../_data/people", () => ({ personTitleIds }));
vi.mock("../_data/person-limit", () => ({ admitPersonQuery: admit }));

const title = (id: number) => ({
    id,
    slug: `titulo-${id}`,
    type: "movie" as const,
    rating: 8,
    votes: 5000,
    runtimeMinutes: 100,
    kinneGenres: ["drama" as const],
    streamingTmdbIds: [8],
});

beforeEach(() => {
    candidates.mockReset().mockResolvedValue([1, 2, 3, 4].map(title));
    personTitleIds.mockReset().mockResolvedValue([3]);
    admit.mockReset().mockResolvedValue(true);
});

describe("drawFiltered com pessoa (person-search A7, D1)", () => {
    it("sorteia só entre os títulos da pessoa, que o servidor deriva do id", async () => {
        const { drawFiltered } = await import("./filters");
        const filters = { ...wireFilters(DEFAULT_FILTERS), personId: 1056 };
        const answer = await drawFiltered({ filters, watched: [], seen: [] });
        expect(personTitleIds).toHaveBeenCalledWith(1056);
        expect(answer).toEqual({ slug: "titulo-3", total: 1 });
    });

    it("sem pessoa, não consulta os títulos de ninguém", async () => {
        const { drawFiltered } = await import("./filters");
        const answer = await drawFiltered({
            filters: wireFilters(DEFAULT_FILTERS),
            watched: [],
            seen: [],
        });
        expect(personTitleIds).not.toHaveBeenCalled();
        expect(answer.total).toBe(4);
    });

    it("recusa uma lista de títulos vinda do navegador", async () => {
        const { drawFiltered } = await import("./filters");
        const filters = { ...wireFilters(DEFAULT_FILTERS), personId: 1056, titles: [1, 2] };
        await expect(drawFiltered({ filters, watched: [], seen: [] })).rejects.toThrow();
        expect(candidates).not.toHaveBeenCalled();
    });

    it("com pessoa, passa pelo limite antes do banco (B4)", async () => {
        admit.mockResolvedValue(false);
        const { drawFiltered } = await import("./filters");
        const filters = { ...wireFilters(DEFAULT_FILTERS), personId: 1056 };
        await expect(drawFiltered({ filters, watched: [], seen: [] })).rejects.toThrow();
        expect(personTitleIds).not.toHaveBeenCalled();
    });

    it("sem pessoa, o sorteio não gasta ficha do limite", async () => {
        const { drawFiltered } = await import("./filters");
        await drawFiltered({ filters: wireFilters(DEFAULT_FILTERS), watched: [], seen: [] });
        expect(admit).not.toHaveBeenCalled();
    });
});
