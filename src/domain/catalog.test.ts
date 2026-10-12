import { describe, expect, it } from "vitest";
import {
    baseSlug,
    sanitizeText,
    formatRuntime,
    isSlug,
    MAX_SLUG_LENGTH,
    meetsQualityFloor,
    pickTrailer,
    uniqueSlug,
    type Video,
} from "./catalog";

describe("meetsQualityFloor", () => {
    it("aceita nota e votos no limite", () => {
        expect(meetsQualityFloor(6.4, 500)).toBe(true);
    });

    it("recusa nota ou votos abaixo do piso", () => {
        expect(meetsQualityFloor(6.39, 10_000)).toBe(false);
        expect(meetsQualityFloor(9, 499)).toBe(false);
    });
});

describe("sanitizeText", () => {
    it("tira controle e invisíveis em qualquer posição e colapsa espaços (A4)", () => {
        expect(sanitizeText("\u200eFuja.\u200e", 300)).toBe("Fuja.");
        expect(sanitizeText("\ufeff\u200b Fuja. \u200d\u2060", 300)).toBe("Fuja.");
        expect(sanitizeText("a\u200eb\u202ec\u0007d", 300)).toBe("abcd");
        expect(sanitizeText("um\n\n dois\t três", 300)).toBe("um dois três");
    });

    it("normaliza para NFC (A4)", () => {
        expect(sanitizeText("a\u0301", 300)).toBe("\u00e1");
    });

    it("recusa o campo vazio ou acima do limite (A5)", () => {
        expect(sanitizeText(null, 300)).toBeNull();
        expect(sanitizeText(" \u200e ", 300)).toBeNull();
        expect(sanitizeText("a".repeat(301), 300)).toBeNull();
        expect(sanitizeText("a".repeat(300), 300)).toHaveLength(300);
    });

    it("mantém marcação como texto puro (A1: o React escapa)", () => {
        expect(sanitizeText("<script>x</script>", 300)).toBe("<script>x</script>");
    });
});

describe("baseSlug", () => {
    it("usa minúsculas, tira acentos e pontuação e junta o ano", () => {
        expect(baseSlug("Corra!", 2017)).toBe("corra-2017");
        expect(baseSlug("O Auto da Compadecida", 2000)).toBe("o-auto-da-compadecida-2000");
        expect(baseSlug("Ação: Missão Ímpossível — Parte 2", 2023)).toBe(
            "acao-missao-impossivel-parte-2-2023",
        );
    });

    it("funciona sem ano e sem letras latinas", () => {
        expect(baseSlug("Duna", null)).toBe("duna");
        expect(baseSlug("기생충", 2019)).toBe("2019");
    });

    it("corta títulos longos para caber com sufixo em MAX_SLUG_LENGTH (B9)", () => {
        const slug = uniqueSlug(
            baseSlug("palavra ".repeat(40), 2020),
            "movie",
            12345678,
            new Set(),
        );
        const taken = new Set([slug]);
        const collided = uniqueSlug(
            baseSlug("palavra ".repeat(40), 2020),
            "movie",
            12345678,
            taken,
        );
        expect(isSlug(slug)).toBe(true);
        expect(isSlug(collided)).toBe(true);
        expect(collided).toMatch(/-12345678$/);
    });
});

describe("isSlug", () => {
    it("aceita o que baseSlug gera", () => {
        expect(isSlug(baseSlug("Suzume", 2022))).toBe(true);
        expect(isSlug("123")).toBe(true);
    });

    it.each([
        ["vazio", ""],
        ["maiúscula", "Suzume"],
        ["hífen duplo", "a--b"],
        ["hífen nas pontas", "-a"],
        ["barra", "a/b"],
        ["longo demais", "a".repeat(MAX_SLUG_LENGTH + 1)],
    ])("recusa %s", (_, value) => {
        expect(isSlug(value)).toBe(false);
    });

    it("aceita o tamanho máximo", () => {
        expect(isSlug("a".repeat(MAX_SLUG_LENGTH))).toBe(true);
    });
});

describe("uniqueSlug", () => {
    const taken = new Set(["duna-2021", "the-office-2005", "the-office-2005-serie"]);

    it("mantém o slug livre", () => {
        expect(uniqueSlug("corra-2017", "movie", 1, taken)).toBe("corra-2017");
    });

    it("acrescenta -serie para série em colisão", () => {
        expect(uniqueSlug("duna-2021", "series", 99, taken)).toBe("duna-2021-serie");
    });

    it("acrescenta o tmdb_id para filme ou quando -serie também colide", () => {
        expect(uniqueSlug("duna-2021", "movie", 438631, taken)).toBe("duna-2021-438631");
        expect(uniqueSlug("the-office-2005", "series", 2316, taken)).toBe("the-office-2005-2316");
    });

    it("usa o tmdb_id quando o título não gera slug", () => {
        expect(uniqueSlug("", "movie", 42, taken)).toBe("42");
    });
});

describe("pickTrailer", () => {
    const yt = (key: string, languageCode: string | null, type = "Trailer"): Video => ({
        site: "YouTube",
        type,
        key,
        languageCode,
    });

    it("prefere trailer em português", () => {
        expect(pickTrailer([yt("en1", "en"), yt("pt1", "pt")], "en")).toEqual({
            youtubeKey: "pt1",
            languageCode: "pt",
        });
    });

    it("senão usa o primeiro no idioma original", () => {
        expect(pickTrailer([yt("ko1", "ko"), yt("en1", "en"), yt("en2", "en")], "en")).toEqual({
            youtubeKey: "en1",
            languageCode: "en",
        });
    });

    it("usa o idioma original mesmo quando não é inglês", () => {
        expect(pickTrailer([yt("en1", "en"), yt("ko1", "ko")], "ko")).toEqual({
            youtubeKey: "ko1",
            languageCode: "ko",
        });
    });

    it("ignora trailer sem idioma", () => {
        expect(pickTrailer([yt("x", null)], "ko")).toBeNull();
    });

    it("ignora o que não é trailer do YouTube", () => {
        const vimeo = { ...yt("v", "pt"), site: "Vimeo" };
        expect(pickTrailer([vimeo, yt("teaser", "pt", "Teaser")], "pt")).toBeNull();
    });

    it("não escolhe trailer em outro idioma", () => {
        expect(pickTrailer([yt("en1", "en")], "ja")).toBeNull();
    });
});

describe("formatRuntime", () => {
    it("escreve horas e minutos, e por episódio em séries", () => {
        expect(formatRuntime(104, "movie")).toBe("1h 44min");
        expect(formatRuntime(128, "movie")).toBe("2h 08min");
        expect(formatRuntime(65, "series")).toBe("1h 05min por episódio");
        expect(formatRuntime(55, "series")).toBe("55min por episódio");
    });
});
