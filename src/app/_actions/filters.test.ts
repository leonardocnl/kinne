import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS, wireFilters } from "@/domain/filters";

const candidates = vi.fn();
const personTitleIds = vi.fn();
const admit = vi.fn();
vi.mock("../_data/candidates", () => ({ candidates }));
vi.mock("../_data/people", () => ({ personTitleIds }));
vi.mock("../_data/person-limit", () => ({ admitPersonQuery: admit }));

const title = (id: number, adult = false) => ({
    id,
    slug: `titulo-${id}`,
    type: "movie" as const,
    rating: 8,
    votes: 5000 - id,
    runtimeMinutes: 100,
    kinneGenres: ["drama" as const],
    streamingTmdbIds: [8],
    adult,
});

const WIRE = wireFilters(DEFAULT_FILTERS);
const request = (extra: object = {}) => ({
    filters: WIRE,
    watched: [],
    seen: [],
    round: 0,
    ...extra,
});

beforeEach(() => {
    candidates.mockReset().mockResolvedValue([1, 2, 3, 4].map((id) => title(id)));
    personTitleIds.mockReset().mockResolvedValue([3]);
    admit.mockReset().mockResolvedValue(true);
});

describe("drawFiltered com pessoa (person-search A7, D1)", () => {
    it("sorteia só entre os títulos da pessoa, que o servidor deriva do id", async () => {
        const { drawFiltered } = await import("./filters");
        const answer = await drawFiltered(request({ filters: { ...WIRE, personId: 1056 } }));
        expect(personTitleIds).toHaveBeenCalledWith(1056);
        expect(answer.slug).toBe("titulo-3");
    });

    it("sem pessoa, não consulta os títulos de ninguém nem gasta ficha do limite", async () => {
        const { drawFiltered } = await import("./filters");
        await drawFiltered(request());
        expect(personTitleIds).not.toHaveBeenCalled();
        expect(admit).not.toHaveBeenCalled();
    });

    it("recusa uma lista de títulos vinda do navegador", async () => {
        const { drawFiltered } = await import("./filters");
        const filters = { ...WIRE, personId: 1056, titles: [1, 2] };
        await expect(drawFiltered(request({ filters }))).rejects.toThrow();
        expect(candidates).not.toHaveBeenCalled();
    });

    it("com pessoa, passa pelo limite antes do banco (B4)", async () => {
        admit.mockResolvedValue(false);
        const { drawFiltered } = await import("./filters");
        await expect(
            drawFiltered(request({ filters: { ...WIRE, personId: 1056 } })),
        ).rejects.toThrow();
        expect(personTitleIds).not.toHaveBeenCalled();
    });
});

describe("drawFiltered em rodadas (recommendation-rounds)", () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => title(i + 1));

    it("sorteia na rodada pedida e diz o tamanho da seguinte quando ela acaba", async () => {
        candidates.mockResolvedValue(fifteen);
        const { drawFiltered } = await import("./filters");
        const first = await drawFiltered(request());
        expect(Number(first.slug?.split("-")[1])).toBeLessThanOrEqual(10);
        const seenAll = Array.from({ length: 10 }, (_, i) => i + 1);
        expect(await drawFiltered(request({ seen: seenAll }))).toEqual({
            slug: null,
            end: { kind: "next", round: 0, size: 5 },
        });
        const second = await drawFiltered(request({ seen: seenAll, round: 1 }));
        expect(Number(second.slug?.split("-")[1])).toBeGreaterThan(10);
    });

    it("rodada além da última responde o fim, sem erro (A3)", async () => {
        candidates.mockResolvedValue(fifteen);
        const { drawFiltered } = await import("./filters");
        expect(await drawFiltered(request({ round: 999 }))).toEqual({
            slug: null,
            end: { kind: "done", total: 15 },
        });
    });

    it.each([
        ["negativa", -1],
        ["grande demais", 1000],
        ["fracionária", 0.5],
        ["texto", "1"],
    ])("recusa rodada %s (A3)", async (_, round) => {
        const { drawFiltered } = await import("./filters");
        await expect(drawFiltered(request({ round }))).rejects.toThrow();
    });

    it("títulos 18 só com o chip 18+ (A1)", async () => {
        candidates.mockResolvedValue([title(1, true)]);
        const { drawFiltered } = await import("./filters");
        expect((await drawFiltered(request())).end).toEqual({ kind: "done", total: 0 });
        const withChip = await drawFiltered(request({ filters: { ...WIRE, adult: true } }));
        expect(withChip.slug).toBe("titulo-1");
    });

    it("recusa o 18+ que não é booleano (A1)", async () => {
        const { drawFiltered } = await import("./filters");
        await expect(
            drawFiltered(request({ filters: { ...WIRE, adult: "true" } })),
        ).rejects.toThrow();
    });
});

describe("filterCandidates (recommendation-rounds C1)", () => {
    it("manda ao contador só os campos que ele usa, com a marca de 18", async () => {
        candidates.mockResolvedValue([title(1, true)]);
        const { filterCandidates } = await import("./filters");
        const [c] = await filterCandidates();
        expect(Object.keys(c).sort()).toEqual(
            [
                "adult",
                "id",
                "kinneGenres",
                "rating",
                "runtimeMinutes",
                "streamingTmdbIds",
                "type",
                "votes",
            ].sort(),
        );
    });
});
