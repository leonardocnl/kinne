import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/infrastructure/http/security-headers";
import { type RunningApp, startBuiltApp } from "./server";

// security.md §10: os cabeçalhos chegam em toda resposta do app construído e servido.
let app: RunningApp;
beforeAll(async () => {
    app = await startBuiltApp();
});
afterAll(async () => {
    await app?.stop();
});

// home, título, sala (formulário e código), API, 404 e as demais páginas
const PATHS = [
    "/",
    "/titulo/suzume-2022",
    "/sala",
    "/sala/ABCD2345",
    "/api/revalidate",
    "/entrar",
    "/perfil",
    "/privacidade",
    "/boas-vindas",
    "/esta-pagina-nao-existe",
];

function directive(csp: string, name: string): string[] {
    const part = csp.split(";").find((d) => d.trim().split(" ")[0] === name);
    return part ? part.trim().split(" ").slice(1) : [];
}

describe.each(PATHS)("cabeçalhos em %s", (path) => {
    it("leva todos os cabeçalhos de segurança", async () => {
        const res = await fetch(`${app.origin}${path}`, { redirect: "manual" });
        const h = res.headers;
        expect(h.get("content-security-policy")).toBe(contentSecurityPolicy(false));
        expect(h.get("strict-transport-security")).toBe(
            "max-age=63072000; includeSubDomains; preload",
        );
        expect(h.get("x-content-type-options")).toBe("nosniff");
        expect(h.get("cross-origin-opener-policy")).toBe("same-origin");
        expect(h.get("x-powered-by")).toBeNull();
        const permissions = h.get("permissions-policy") ?? "";
        for (const feature of ["camera", "microphone", "geolocation"]) {
            expect(permissions).toContain(`${feature}=()`);
        }
        // a sala nunca manda o endereço (com o código) como referência a outro site
        expect(h.get("referrer-policy")).toBe(
            path.startsWith("/sala") ? "no-referrer" : "strict-origin-when-cross-origin",
        );
    });
});

describe("CSP de produção", () => {
    it("não permite eval e restringe imagens, conexões, formulários e base", async () => {
        const res = await fetch(`${app.origin}/`);
        const csp = res.headers.get("content-security-policy") ?? "";
        expect(directive(csp, "script-src")).not.toContain("'unsafe-eval'");
        expect(directive(csp, "default-src")).toEqual(["'none'"]);
        expect(directive(csp, "img-src")).toEqual(["'self'", "image.tmdb.org"]);
        expect(directive(csp, "connect-src")).toEqual(["'self'"]);
        expect(directive(csp, "form-action")).toEqual(["'self'"]);
        expect(directive(csp, "base-uri")).toEqual(["'none'"]);
        expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
        expect(directive(csp, "object-src")).toEqual(["'none'"]);
        expect(csp).toContain("upgrade-insecure-requests");
    });

    it("também cobre os arquivos estáticos", async () => {
        const html = await (await fetch(`${app.origin}/`)).text();
        const chunk = /src="(\/_next\/static\/[^"]+\.js)"/.exec(html)?.[1];
        expect(chunk).toBeTruthy();
        const res = await fetch(`${app.origin}${chunk}`);
        expect(res.headers.get("x-content-type-options")).toBe("nosniff");
        expect(res.headers.get("content-security-policy")).toBe(contentSecurityPolicy(false));
    });
});
