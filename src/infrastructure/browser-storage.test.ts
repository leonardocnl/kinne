import { afterEach, describe, expect, it, vi } from "vitest";
import { savedStreamings, shownTitles, watchedTitles } from "./browser-storage";

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
});
