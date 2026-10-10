import { describe, expect, it } from "vitest";
import {
    baseSlug,
    cleanText,
    formatRuntime,
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

describe("cleanText", () => {
    it("tira espaços e caracteres invisíveis só das pontas", () => {
        expect(cleanText("\u200eFuja.\u200e")).toBe("Fuja.");
        expect(cleanText("\ufeff\u200b Fuja. \u200d\u2060")).toBe("Fuja.");
        expect(cleanText("a\u200eb")).toBe("a\u200eb");
    });

    it("devolve null para texto vazio ou só invisível", () => {
        expect(cleanText(null)).toBeNull();
        expect(cleanText(" \u200e ")).toBeNull();
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
