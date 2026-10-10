import { describe, expect, it } from "vitest";
import { baseSlug, meetsQualityFloor, pickTrailer, uniqueSlug, type Video } from "./catalog";

describe("meetsQualityFloor", () => {
    it("aceita nota e votos no limite", () => {
        expect(meetsQualityFloor(6.4, 500)).toBe(true);
    });

    it("recusa nota ou votos abaixo do piso", () => {
        expect(meetsQualityFloor(6.39, 10_000)).toBe(false);
        expect(meetsQualityFloor(9, 499)).toBe(false);
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

    it("ignora o que não é trailer do YouTube", () => {
        const vimeo = { ...yt("v", "pt"), site: "Vimeo" };
        expect(pickTrailer([vimeo, yt("teaser", "pt", "Teaser")], "pt")).toBeNull();
    });

    it("não escolhe trailer em outro idioma", () => {
        expect(pickTrailer([yt("en1", "en")], "ja")).toBeNull();
    });
});
