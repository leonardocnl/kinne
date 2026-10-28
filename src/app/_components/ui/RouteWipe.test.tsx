import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ColorWipe, wipeSeconds } from "./ColorWipe";

vi.mock("next/navigation", () => ({ useRouter: () => ({}), usePathname: () => "/" }));
const { RouteWipe } = await import("./RouteWipe");

const dir = import.meta.dirname;

describe("RouteWipe", () => {
    it("sem clique, só os children e o probe (que só aparece no computador sem movimento reduzido)", () => {
        const html = renderToStaticMarkup(
            <RouteWipe>
                <main>página</main>
            </RouteWipe>,
        );
        expect(html).toContain("<main>página</main>");
        expect(html).toMatch(
            /<span aria-hidden="true" class="[^"]*hidden desktop:motion-safe:block"/,
        );
        expect(html).not.toContain("backdrop-blur-glass");
    });

    it("cobre e descobre em cerca de 0,7 s cada", () => {
        expect(wipeSeconds(0.45, 10, 0.03)).toBeCloseTo(0.72);
    });

    it("só os sorteios da tela do título pedem a cortina; abas e links não", () => {
        const wipe = readFileSync(join(dir, "RouteWipe.tsx"), "utf8");
        expect(wipe).not.toMatch(/addEventListener\("click"/);
        const title = join(dir, "..", "title");
        for (const file of ["TitleView.tsx", "useFilteredDraw.ts", "useSurprise.ts"])
            expect(readFileSync(join(title, file), "utf8")).toContain("wipeRouter(router)");
    });
});

describe("ColorWipe", () => {
    const html = renderToStaticMarkup(
        <ColorWipe covering onCovered={() => {}} onUncovered={() => {}} />,
    );

    it("é decorativa e fica acima de tudo", () => {
        expect(html).toMatch(/^<div aria-hidden="true" class="[^"]*fixed inset-0 z-100/);
        expect(html).not.toMatch(/<(a|button|input)\b|tabindex/);
    });

    it("10 faixas de vidro, verticais, com fios do signal ao signal-deep (sem arco-íris)", () => {
        expect(html.match(/backdrop-blur-glass/g)).toHaveLength(10);
        expect(html).toContain("flex-row"); // vertical: colunas que descem do topo
        const strokes = [...html.matchAll(/background-color:([^;"]+)/g)].map((m) => m[1]);
        expect(strokes).toHaveLength(20);
        for (const s of strokes)
            expect(s).toMatch(/var\(--color-signal\), var\(--color-signal-deep\)/);
        expect(html).not.toMatch(/#[0-9a-f]{3,8}/i);
    });
});
