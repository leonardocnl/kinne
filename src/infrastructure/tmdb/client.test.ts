import { describe, expect, it } from "vitest";
import { publicErrorMessage, TmdbClient, TmdbHttpError } from "./client";

const json = (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init);

function client(responses: (() => Response | Promise<Response>)[]) {
    const waits: number[] = [];
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: URL, init: RequestInit) => {
        calls.push({ url: String(url), init });
        return responses.shift()!();
    }) as unknown as typeof fetch;
    const c = new TmdbClient("eyJtoken", fetchFn, async (ms) => {
        waits.push(ms);
    });
    return { c, waits, calls };
}

describe("TmdbClient", () => {
    it("manda o token só no cabeçalho, com timeout (D1, B7)", async () => {
        const { c, calls } = client([() => json({ ok: 1 })]);
        expect(await c.get("/movie/1", { language: "pt-BR" })).toEqual({ ok: 1 });
        expect(calls[0].url).not.toMatch(/eyJ/);
        expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
            "Bearer eyJtoken",
        );
        expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
    });

    it("respeita Retry-After no 429 e tenta de novo em 5xx (B5)", async () => {
        const { c, waits } = client([
            () => json({}, { status: 429, headers: { "retry-after": "3" } }),
            () => json({}, { status: 503 }),
            () => json({ ok: 1 }),
        ]);
        expect(await c.get("/x")).toEqual({ ok: 1 });
        expect(waits[0]).toBe(3000);
        expect(waits[1]).toBeLessThanOrEqual(2000);
    });

    it("desiste depois do limite de tentativas (B5)", async () => {
        const { c, waits } = client(Array(6).fill(() => json({}, { status: 500 })));
        await expect(c.get("/x")).rejects.toThrow(TmdbHttpError);
        expect(waits).toHaveLength(5);
    });

    it("não repete 404 e o erro não leva a query (D1)", async () => {
        const { c } = client([() => json({}, { status: 404 })]);
        const e = (await c
            .get("/movie/9", { api_key: "segredo" })
            .catch((x: TmdbHttpError) => x)) as TmdbHttpError;
        expect(e).toBeInstanceOf(TmdbHttpError);
        expect(e.status).toBe(404);
        expect(e.message).toBe("TMDB respondeu 404 em /movie/9");
    });

    it("recusa corpo acima de 5 MB (B7)", async () => {
        const big = () => new Response("x".repeat(5 * 1024 * 1024 + 1));
        const { c } = client(Array(6).fill(big));
        await expect(c.get("/x")).rejects.toThrow(/grande demais/);
    });
});

describe("publicErrorMessage (D1)", () => {
    it("mantém a mensagem do TMDB, que só tem status e caminho", () => {
        expect(publicErrorMessage(new TmdbHttpError(500, "/movie/1"))).toBe(
            "TMDB respondeu 500 em /movie/1",
        );
    });

    it.each([
        new Error("getaddrinfo ENOTFOUND ep-secreto.neon.tech"),
        new Error("password authentication failed for user kinne_sync postgres://u:p@h/db"),
        "texto solto",
        null,
    ])("troca qualquer outro erro por uma mensagem fixa", (e) => {
        const message = publicErrorMessage(e);
        expect(message).toBe("Erro na carga (detalhe omitido por segurança)");
        expect(publicErrorMessage(e, "Erro no seed")).toBe(
            "Erro no seed (detalhe omitido por segurança)",
        );
    });
});
