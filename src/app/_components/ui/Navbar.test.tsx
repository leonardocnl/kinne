import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contrast } from "../../design/_sections/contrast";
import { Navbar } from "./Navbar";

const dir = import.meta.dirname;

describe("Navbar", () => {
    it("tem duas abas com os endereços certos, num nav Principal", () => {
        const html = renderToStaticMarkup(<Navbar current="inicio" />);
        expect(html).toContain('<nav aria-label="Principal"');
        expect(html).toMatch(/href="\/"[^>]*>[\s\S]*Início/);
        expect(html).toMatch(/href="\/sobre"[^>]*>[\s\S]*Sobre/);
        expect(html.match(/<a /g)).toHaveLength(2);
        expect(html).not.toMatch(/<(svg|span)[^>]*>[^<]*[\p{Extended_Pictographic}]/u);
    });

    it.each([
        ["inicio", "/", "/sobre"],
        ["sobre", "/sobre", "/"],
    ] as const)("marca só a aba ativa (%s) com aria-current", (current, active, other) => {
        const html = renderToStaticMarkup(<Navbar current={current} />);
        expect(html.match(/aria-current="page"/g)).toHaveLength(1);
        expect(html).toMatch(
            new RegExp(
                `href="${active}"[^>]*aria-current="page"|aria-current="page"[^>]*href="${active}"`,
            ),
        );
        expect(html).not.toMatch(new RegExp(`href="${other}"[^>]*aria-current`));
        // a luz acende só na ativa
        expect(html.match(/bg-limelight/g)).toHaveLength(1);
        expect(html.match(/shadow-limelight/g)).toHaveLength(1);
    });

    it("não usa o amarelo (signal)", () => {
        expect(renderToStaticMarkup(<Navbar current="inicio" />)).not.toContain("signal");
    });

    it("é componente de servidor: sem use client nem hooks", () => {
        const source = readFileSync(join(dir, "Navbar.tsx"), "utf8");
        expect(source).not.toMatch(/use client/);
        expect(source).not.toMatch(/usePathname|useState|useEffect/);
    });

    // vidro escuro sobre a pior imagem possível (branco puro): texto ativo, inativo e o cone no topo
    it("dá 7:1 no texto sobre o vidro, mesmo com imagem branca atrás", () => {
        const css = readFileSync(join(dir, "../../globals.css"), "utf8");
        const token = (name: string) => css.match(new RegExp(`--${name}: ([^;]+);`))![1];
        const paper = token("color-paper");
        const [r, g, b, a] = token("color-nav")
            .match(/[\d.]+/g)!
            .map(Number);
        const glass = `rgb(${[r, g, b].map((c) => Math.round(c * a + 255 * (1 - a))).join(" ")})`;
        expect(contrast(paper, glass)).toBeGreaterThanOrEqual(7);
        expect(contrast(token("color-soft"), glass)).toBeGreaterThanOrEqual(7);
        // o cone clareia o fundo do texto ativo; o topo do texto fica a ~30% da altura da aba,
        // onde o degradê ainda tem 70% do alfa
        const coneAlpha = Number(
            css.match(/--background-image-limelight: linear-gradient\(rgb\([^/]+\/ ([\d.]+)\)/)![1],
        );
        const [gr, gg, gb] = glass.match(/\d+/g)!.map(Number);
        const lit = [gr, gg, gb].map((c) =>
            Math.round(242 * coneAlpha * 0.7 + c * (1 - coneAlpha * 0.7)),
        );
        expect(contrast(paper, `rgb(${lit.join(" ")})`)).toBeGreaterThanOrEqual(7);
    });
});
