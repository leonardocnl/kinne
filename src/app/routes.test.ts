import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// H3: o termo da busca nunca vira caminho nem parâmetro de URL. A lista de rotas é fechada: uma
// rota nova (como /busca/[termo] ou /api/search) quebra este teste e passa por revisão.
const appDir = import.meta.dirname;
const files = readdirSync(appDir, { recursive: true, encoding: "utf8" });

const routes = files
    .filter((f) => /(^|\/)(page|route)\.tsx?$/.test(f))
    .map((f) => "/" + f.replace(/(^|\/)(page|route)\.tsx?$/, ""))
    .sort();

describe("rotas (H3)", () => {
    it("só as rotas conhecidas existem", () => {
        expect(routes).toEqual([
            "/",
            "/[secret]",
            "/api/revalidate",
            "/design",
            "/sala",
            "/sala/[code]",
            "/titulo/[slug]",
        ]);
    });

    it("a busca é uma server action só (G8), sem nada da busca em rota ou URL", () => {
        const action = readFileSync(join(appDir, "_actions/search.ts"), "utf8");
        expect(action.match(/^export /gm)).toHaveLength(1);
        const panel = readFileSync(join(appDir, "_components/search/SearchPanel.tsx"), "utf8");
        expect(panel).toContain('goToTitle(router, "push", result.slug, "busca")');
        expect(panel).not.toMatch(/searchParams|URLSearchParams|\?(q|termo|busca)=/);
        expect(panel).not.toMatch(/localStorage|sessionStorage/); // G10
        expect(panel).toContain('autoComplete="off"');
    });

    it("nenhum código monta ou lê query string de endereço do Kinne (security §8)", () => {
        const offenders = files
            .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
            .filter((f) => {
                const source = readFileSync(join(appDir, f), "utf8");
                return /useSearchParams|searchParams\b|["'`][^"'`\s]*\?(origem|filtros)\b/.test(
                    source,
                );
            });
        expect(offenders).toEqual([]);
    });
});
