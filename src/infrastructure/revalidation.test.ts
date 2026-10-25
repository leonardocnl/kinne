import { afterEach, describe, expect, it, vi } from "vitest";
import {
    LISTS_TAG,
    REVALIDATE_PATH,
    REVALIDATE_SECRET_HEADER,
    requestGraphRevalidation,
    revalidateBodySchema,
} from "./revalidation";

afterEach(() => vi.unstubAllGlobals());

describe("requestGraphRevalidation (feelings-and-taste-ui C1)", () => {
    it("pede ao endpoint existente que invalide as listas do catálogo, onde o grafo vive", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal("fetch", fetchMock);
        const result = await requestGraphRevalidation("https://kinne.example", "segredo");
        expect(result).toEqual({ sent: 1, failed: 0 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`https://kinne.example${REVALIDATE_PATH}`);
        expect(init.method).toBe("POST");
        expect(init.headers[REVALIDATE_SECRET_HEADER]).toBe("segredo");
        const body = JSON.parse(init.body);
        expect(body).toEqual({ tags: [LISTS_TAG] });
        // o endpoint aceita esse corpo
        expect(revalidateBodySchema.safeParse(body).success).toBe(true);
    });

    it("conta a falha sem lançar", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
        expect(await requestGraphRevalidation("https://kinne.example", "s")).toEqual({
            sent: 0,
            failed: 1,
        });
    });
});
