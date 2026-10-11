import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS } from "@/domain/filters";
import {
    browserId,
    filteredRun,
    saveFilters,
    savedFilters,
    savedStreamings,
    shownTitles,
    teamBrowser,
    watchedTitles,
} from "./browser-storage";

function memoryStorage(): Storage {
    const data = new Map<string, string>();
    return {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
        clear: () => data.clear(),
        key: (i) => [...data.keys()][i] ?? null,
        get length() {
            return data.size;
        },
    };
}

afterEach(() => vi.unstubAllGlobals());

describe("browser storage", () => {
    it("guarda os marcados sem repetir e lê de volta", () => {
        vi.stubGlobal("window", { localStorage: memoryStorage() });
        watchedTitles.add(3);
        watchedTitles.add(7);
        watchedTitles.add(3);
        expect(watchedTitles.read()).toEqual([3, 7]);
    });

    it("descarta o que não tem o formato esperado", () => {
        const localStorage = memoryStorage();
        localStorage.setItem("kinne:watched", '[1, "2", -3, 4.5, null, 5]');
        localStorage.setItem("kinne:streamings", '["netflix", "apple-tv", 8, "max"]');
        vi.stubGlobal("window", { localStorage });
        expect(watchedTitles.read()).toEqual([1, 5]);
        expect(savedStreamings()).toEqual(["netflix", "max"]);
        localStorage.setItem("kinne:watched", "{quebrado");
        expect(watchedTitles.read()).toEqual([]);
    });

    it("não quebra com o armazenamento bloqueado", () => {
        vi.stubGlobal("window", {
            get sessionStorage(): Storage {
                throw new DOMException("bloqueado", "SecurityError");
            },
        });
        expect(shownTitles.read()).toEqual([]);
        expect(() => shownTitles.add(1)).not.toThrow();
    });

    it("streamings ficam entre visitas; o resto dos filtros, só na aba (US002 C7, RNG005)", () => {
        const localStorage = memoryStorage();
        vi.stubGlobal("window", { localStorage, sessionStorage: memoryStorage() });
        expect(savedFilters()).toEqual(DEFAULT_FILTERS);
        const chosen = { ...DEFAULT_FILTERS, streamings: ["max" as const], minRating: 7.5 };
        saveFilters(chosen);
        expect(savedFilters()).toEqual(chosen);
        // outra visita: aba nova, mesmo navegador
        vi.stubGlobal("window", { localStorage, sessionStorage: memoryStorage() });
        expect(savedFilters()).toEqual({ ...DEFAULT_FILTERS, streamings: ["max"] });
    });

    it("filtros mexidos à mão voltam ao padrão, mantendo os streamings", () => {
        const localStorage = memoryStorage();
        const sessionStorage = memoryStorage();
        localStorage.setItem("kinne:streamings", '["netflix"]');
        sessionStorage.setItem("kinne:filters", '{"type":"anime"}');
        vi.stubGlobal("window", { localStorage, sessionStorage });
        expect(savedFilters()).toEqual({ ...DEFAULT_FILTERS, streamings: ["netflix"] });
    });

    it("a rodada dos filtros guarda os mostrados e recomeça sem eles (US004 C2 e C3)", () => {
        vi.stubGlobal("window", { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
        const filters = { ...DEFAULT_FILTERS, type: "movie" as const };
        filteredRun.start(filters, [9]);
        filteredRun.see(1);
        filteredRun.see(2);
        filteredRun.see(1);
        expect(filteredRun.read()).toEqual({ filters, watched: [9], seen: [1, 2] });
        filteredRun.restart();
        expect(filteredRun.read()).toEqual({ filters, watched: [9], seen: [] });
    });

    it("sem rodada salva, começa uma com os filtros e os marcados de agora", () => {
        const localStorage = memoryStorage();
        localStorage.setItem("kinne:watched", "[4]");
        vi.stubGlobal("window", { localStorage, sessionStorage: memoryStorage() });
        expect(filteredRun.read()).toEqual({ filters: DEFAULT_FILTERS, watched: [4], seen: [] });
    });

    it("o código do navegador é criado uma vez e fica entre visitas (RNG005)", () => {
        const localStorage = memoryStorage();
        vi.stubGlobal("window", { localStorage });
        const id = browserId();
        expect(id).toMatch(/^[0-9a-f-]{36}$/);
        expect(browserId()).toBe(id);
        expect(localStorage.getItem("kinne:browser-id")).toBe(JSON.stringify(id));
    });

    it("a marca da equipe fica no navegador até limparem os dados (US006 C1 e C3)", () => {
        vi.stubGlobal("window", { localStorage: memoryStorage() });
        expect(teamBrowser.is()).toBe(false);
        teamBrowser.mark();
        expect(teamBrowser.is()).toBe(true);
        vi.stubGlobal("window", { localStorage: memoryStorage() });
        expect(teamBrowser.is()).toBe(false);
    });
});
