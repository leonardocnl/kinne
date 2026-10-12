import { describe, expect, it } from "vitest";
import {
    exceedsRejectThreshold,
    exceedsSafetyValve,
    isRecommendable,
    normalizeBrCertification,
    pickBackdrop,
    pickCertification,
    planRemovals,
    type RecommendabilityInput,
} from "./catalog-sync";

describe("isRecommendable (C7)", () => {
    const ok: RecommendabilityInput = {
        hasSynopsis: true,
        hasBackdrop: true,
        voteCount: 50,
        certification: "14",
        isActive: true,
        isBlocked: false,
    };

    it("aceita quem cumpre todas as regras, inclusive 18", () => {
        expect(isRecommendable(ok)).toBe(true);
        expect(isRecommendable({ ...ok, certification: "18" })).toBe(true);
    });

    it.each<[string, Partial<RecommendabilityInput>]>([
        ["sem sinopse pt-BR", { hasSynopsis: false }],
        ["sem imagem larga", { hasBackdrop: false }],
        ["menos de 50 votos", { voteCount: 49 }],
        ["sem classificação", { certification: null }],
        ["inativo", { isActive: false }],
        ["bloqueado", { isBlocked: true }],
    ])("recusa %s", (_, change) => {
        expect(isRecommendable({ ...ok, ...change })).toBe(false);
    });
});

describe("certificação (A7)", () => {
    it("normaliza grafias brasileiras", () => {
        expect(normalizeBrCertification("AL")).toBe("L");
        expect(normalizeBrCertification("A12")).toBe("12");
        expect(normalizeBrCertification(" 16 ")).toBe("16");
        expect(normalizeBrCertification("")).toBeNull();
        expect(normalizeBrCertification("PG")).toBeNull();
    });

    it("prefere a brasileira, cai para a americana e marca a origem", () => {
        expect(pickCertification("movie", ["", "14"], ["R"])).toEqual({
            certification: "14",
            source: "br",
        });
        expect(pickCertification("movie", [], ["NR", "R"])).toEqual({
            certification: "16",
            source: "us",
        });
        expect(pickCertification("series", [], ["TV-MA"])).toEqual({
            certification: "18",
            source: "us",
        });
        expect(pickCertification("series", ["x"], ["R"])).toEqual({
            certification: null,
            source: "none",
        });
    });
});

describe("pickBackdrop (B10)", () => {
    it("prefere a maior sem texto", () => {
        expect(
            pickBackdrop([
                { path: "/a.jpg", width: 3840, languageCode: "en" },
                { path: "/b.jpg", width: 1920, languageCode: null },
                { path: "/c.jpg", width: 1280, languageCode: null },
            ]),
        ).toEqual({ path: "/b.jpg", width: 1920 });
    });

    it("usa a maior com texto se não houver sem texto, e null sem imagens", () => {
        expect(
            pickBackdrop([
                { path: "/a.jpg", width: 1280, languageCode: "pt" },
                { path: "/b.jpg", width: 1920, languageCode: "en" },
            ]),
        ).toEqual({ path: "/b.jpg", width: 1920 });
        expect(pickBackdrop([])).toBeNull();
    });
});

describe("válvula de segurança (B1)", () => {
    it("aborta acima de 5% do que está ativo", () => {
        expect(exceedsSafetyValve(1000, 50)).toBe(false);
        expect(exceedsSafetyValve(1000, 51)).toBe(true);
        expect(exceedsSafetyValve(0, 0)).toBe(false);
    });
});

describe("limite de recusas (B2)", () => {
    it("aborta acima de 2% das respostas", () => {
        expect(exceedsRejectThreshold(1000, 20)).toBe(false);
        expect(exceedsRejectThreshold(1000, 21)).toBe(true);
    });
});

describe("planRemovals (B6)", () => {
    it("apaga só quem nenhum evento referencia; os outros ficam inativos", () => {
        expect(
            planRemovals([
                { id: 1, referenced: false },
                { id: 2, referenced: true },
            ]),
        ).toEqual({ deleteIds: [1], inactivateIds: [2] });
    });
});
