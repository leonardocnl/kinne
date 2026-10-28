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
        expect(html).not.toContain("bg-ink");
    });

    it("cobre e descobre em cerca de 0,7 s cada", () => {
        expect(wipeSeconds(0.45, 10, 0.03)).toBeCloseTo(0.72);
    });

    it("a navbar não desliza a luz quando a troca é pela cortina", () => {
        const navbar = readFileSync(join(dir, "Navbar.tsx"), "utf8");
        expect(navbar).toContain('{ wipe: "none", default: "limelight" }');
        const wipe = readFileSync(join(dir, "RouteWipe.tsx"), "utf8");
        expect(wipe).toContain('transitionTypes: ["wipe"]');
        expect(wipe).not.toContain("stopPropagation()");
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

    it("10 faixas em ink, com fios do signal ao signal-deep (sem arco-íris)", () => {
        expect(html.match(/bg-ink/g)).toHaveLength(10);
        const strokes = [...html.matchAll(/background-color:([^;"]+)/g)].map((m) => m[1]);
        expect(strokes).toHaveLength(20);
        for (const s of strokes)
            expect(s).toMatch(/var\(--color-signal\), var\(--color-signal-deep\)/);
        expect(html).not.toMatch(/#[0-9a-f]{3,8}/i);
    });
});
