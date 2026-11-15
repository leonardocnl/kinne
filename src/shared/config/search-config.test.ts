import { describe, expect, it } from "vitest";
import { searchConfig } from "./search-config";

const on = { SEARCH_TMDB_FALLBACK: "on", TMDB_TOKEN: "eyJ" };

describe("searchConfig (H1, I2)", () => {
    it("sem variáveis: TMDB desligado e limites para uma sala de aula", () => {
        expect(searchConfig({})).toEqual({
            fallback: false,
            secret: undefined,
            catalogPerMinute: 600,
            fallbackPerMinute: 60,
            tmdbPerMinute: 30,
            tmdbPerDay: 2000,
        });
    });

    it("SEARCH_TMDB_FALLBACK liga e desliga o TMDB", () => {
        expect(searchConfig(on).fallback).toBe(true);
        expect(searchConfig({ ...on, SEARCH_TMDB_FALLBACK: "off" }).fallback).toBe(false);
    });

    it("variável vazia usa o padrão", () => {
        const config = searchConfig({ ...on, SEARCH_TMDB_PER_DAY: "", RATE_LIMIT_SECRET: "" });
        expect(config.fallback).toBe(true);
        expect(config.tmdbPerDay).toBe(2000);
        expect(config.secret).toBeUndefined();
    });

    it("limites vêm das variáveis", () => {
        expect(searchConfig({ ...on, SEARCH_TMDB_PER_DAY: "500" }).tmdbPerDay).toBe(500);
    });

    it.each([
        ["valor desconhecido no interruptor", { ...on, SEARCH_TMDB_FALLBACK: "yes" }],
        ["limite inválido", { ...on, SEARCH_TMDB_PER_MINUTE: "-1" }],
        ["segredo curto", { ...on, RATE_LIMIT_SECRET: "curto" }],
        ["sem token do TMDB", { SEARCH_TMDB_FALLBACK: "on" }],
    ])("%s desliga o TMDB (falha fechada)", (_, env) => {
        expect(searchConfig(env).fallback).toBe(false);
    });
});
