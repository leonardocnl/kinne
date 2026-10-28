import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS, wireFilters } from "@/domain/filters";

const candidates = vi.fn();
const personTitleIds = vi.fn();
const admit = vi.fn();
const drawAccount = vi.fn();
const admitDraw = vi.fn();
vi.mock("../_data/draw-limit", () => ({ admitDraw }));
vi.mock("../_data/account", () => ({ drawAccount }));
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
    feelings: 0b111111111,
});

const WIRE = wireFilters(DEFAULT_FILTERS);
const request = (extra: object = {}) => ({
    filters: WIRE,
    watched: [],
    seen: [],
    taste: { liked: [], willWatch: [], disliked: [] },
    round: 0,
    ...extra,
});

beforeEach(() => {
    drawAccount.mockReset().mockResolvedValue(null);
    candidates.mockReset().mockResolvedValue([1, 2, 3, 4].map((id) => title(id)));
    personTitleIds.mockReset().mockResolvedValue([3]);
    admit.mockReset().mockResolvedValue(true);
    admitDraw.mockReset().mockResolvedValue(true);
});

// o sorteio que não foi limitado (os testes abaixo só tratam desse caso)
async function draw(input: unknown) {
    const { drawFiltered } = await import("./filters");
    const answer = await drawFiltered(input);
    if ("kind" in answer) throw new Error("limitado");
    return answer;
}

describe("drawFiltered com limite (security.md §7)", () => {
    it("passado o limite do visitante, recusa antes de qualquer consulta", async () => {
        admitDraw.mockResolvedValue(false);
        const { drawFiltered } = await import("./filters");
        expect(await drawFiltered(request())).toEqual({ kind: "limited" });
        expect(candidates).not.toHaveBeenCalled();
        expect(drawAccount).not.toHaveBeenCalled();
    });
});

describe("drawFiltered com pessoa (person-search A7, D1)", () => {
    it("sorteia só entre os títulos da pessoa, que o servidor deriva do id", async () => {
        const answer = await draw(request({ filters: { ...WIRE, personId: 1056 } }));
        expect(personTitleIds).toHaveBeenCalledWith(1056);
        expect(answer.slug).toBe("titulo-3");
    });

    it("sem pessoa, não consulta os títulos de ninguém nem gasta ficha do limite", async () => {
        await draw(request());
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
        const first = await draw(request());
        expect(Number(first.slug?.split("-")[1])).toBeLessThanOrEqual(10);
        const seenAll = Array.from({ length: 10 }, (_, i) => i + 1);
        expect(await drawFiltered(request({ seen: seenAll }))).toEqual({
            slug: null,
            end: { kind: "next", round: 0, size: 5 },
        });
        const second = await draw(request({ seen: seenAll, round: 1 }));
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
        expect((await draw(request())).end).toEqual({ kind: "done", total: 0 });
        const withChip = await draw(request({ filters: { ...WIRE, adult: true } }));
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
                "feelings",
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

describe("drawFiltered com a conta aberta (US015 RNE003, ameaças A4, B2, B3)", () => {
    const ACCOUNT = {
        streamings: [],
        watched: [],
        taste: { liked: [], willWatch: [], disliked: [] },
    };

    it("sentimento sem sessão é recusado no servidor, mesmo chamando a ação direto (B3)", async () => {
        const { drawFiltered } = await import("./filters");
        await expect(
            drawFiltered(request({ filters: { ...WIRE, feeling: "cry" } })),
        ).rejects.toThrow("Pedido recusado");
        expect(candidates).not.toHaveBeenCalled();
    });

    it("com sessão o sentimento passa", async () => {
        drawAccount.mockResolvedValue(ACCOUNT);
        const { drawFiltered } = await import("./filters");
        await expect(
            drawFiltered(request({ filters: { ...WIRE, feeling: "cry" } })),
        ).resolves.toBeTruthy();
    });

    it("com sessão, o 'Já vi' do pedido não vale: vale o da conta (B2)", async () => {
        // o pedido diz que todos foram vistos; a conta não viu nenhum
        drawAccount.mockResolvedValue(ACCOUNT);
        const answer = await draw(request({ watched: [1, 2, 3, 4] }));
        expect(answer.slug).not.toBeNull();
    });

    it("com sessão, o 'Já vi' da conta vale mesmo que o pedido mande a lista vazia", async () => {
        drawAccount.mockResolvedValue({ ...ACCOUNT, watched: [1, 2, 3, 4] });
        const answer = await draw(request({ watched: [] }));
        expect(answer.slug).toBeNull();
    });

    it("com sessão, os streamings da conta valem no lugar dos do pedido", async () => {
        candidates.mockResolvedValue([title(1), { ...title(2), streamingTmdbIds: [307] }]);
        drawAccount.mockResolvedValue({ ...ACCOUNT, streamings: ["globoplay"] });
        const answer = await draw(request({ filters: { ...WIRE, streamings: ["netflix"] } }));
        expect(answer.slug).toBe("titulo-2");
    });

    it("sem sessão, as listas do pedido seguem valendo (visitante)", async () => {
        const answer = await draw(request({ watched: [1, 2, 3, 4] }));
        expect(answer.slug).toBeNull();
    });
});
