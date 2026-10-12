import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

const SECRET = "s".repeat(43);

const post = (body: unknown, secret: string | null = SECRET) =>
    new Request("https://kinne.test/api/revalidate", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(secret === null ? {} : { "x-revalidate-secret": secret }),
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });

describe("POST /api/revalidate (C4, C8)", () => {
    beforeEach(() => {
        vi.resetModules();
        revalidateTag.mockClear();
        process.env.REVALIDATE_SECRET = SECRET;
    });

    it("invalida as etiquetas com o segredo certo", async () => {
        const { POST } = await import("./route");
        const res = await POST(post({ tags: ["catalog:lists", "title:corra-2017"] }));
        expect(res.status).toBe(204);
        expect(revalidateTag).toHaveBeenCalledWith("title:corra-2017", { expire: 0 });
    });

    it.each<[string, unknown, string | null]>([
        ["sem segredo", { tags: ["catalog"] }, null],
        ["segredo errado", { tags: ["catalog"] }, "errado"],
        ["chave desconhecida", { tags: ["catalog"], x: 1 }, SECRET],
        ["etiqueta fora do formato", { tags: ["title:../x"] }, SECRET],
        ["lista vazia", { tags: [] }, SECRET],
        ["JSON inválido", "{", SECRET],
        ["corpo grande demais", { tags: ["catalog"], pad: "x".repeat(20_000) }, SECRET],
    ])("responde 404 com %s", async (_, body, secret) => {
        const { POST } = await import("./route");
        expect((await POST(post(body, secret))).status).toBe(404);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("responde 404 sem segredo configurado no servidor", async () => {
        delete process.env.REVALIDATE_SECRET;
        const { POST } = await import("./route");
        expect((await POST(post({ tags: ["catalog"] }, ""))).status).toBe(404);
    });

    it("outros métodos respondem 404", async () => {
        const route = await import("./route");
        for (const m of [
            route.GET,
            route.PUT,
            route.PATCH,
            route.DELETE,
            route.OPTIONS,
            route.HEAD,
        ]) {
            expect(m().status).toBe(404);
        }
    });

    it("só falhas contam: flood sem segredo vira 404 e não barra quem tem o segredo", async () => {
        const { POST } = await import("./route");
        for (let i = 0; i < 100; i++) {
            expect((await POST(post({ tags: ["catalog"] }, "errado"))).status).toBe(404);
        }
        expect((await POST(post({ tags: ["catalog"] }))).status).toBe(204);
    });

    it("sucessos não contam para o limite", async () => {
        const { POST } = await import("./route");
        for (let i = 0; i < 100; i++) {
            expect((await POST(post({ tags: ["catalog"] }))).status).toBe(204);
        }
    });

    it("com o segredo certo, corpos ruins em excesso também viram 404, sem 429", async () => {
        const { POST } = await import("./route");
        const statuses = new Set<number>();
        for (let i = 0; i < 40; i++) statuses.add((await POST(post("{"))).status);
        expect([...statuses]).toEqual([404]);
        expect((await POST(post({ tags: ["catalog"] }))).status).toBe(404);
        expect(revalidateTag).not.toHaveBeenCalled();
    });
});
