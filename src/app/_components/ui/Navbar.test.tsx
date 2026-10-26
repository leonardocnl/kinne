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
        // a marca também é link para o início
        expect(html).toMatch(
            /href="\/"[^>]*aria-label="Kinne, ir para o início"|aria-label="Kinne, ir para o início"[^>]*href="\/"/,
        );
        expect(html.match(/<a /g)).toHaveLength(3);
        expect(html).not.toMatch(/<(svg|span)[^>]*>[^<]*[\p{Extended_Pictographic}]/u);
    });

    it.each([
        ["inicio", 0, "/"],
        ["sobre", 1, "/sobre"],
    ] as const)("%s: aria-current só na ativa e a luz no índice %i", (current, index, href) => {
        const html = renderToStaticMarkup(<Navbar current={current} />);
        expect(html.match(/aria-current="page"/g)).toHaveLength(1);
        expect(html).toMatch(
            new RegExp(
                `href="${href}"[^>]*aria-current="page"|aria-current="page"[^>]*href="${href}"`,
            ),
        );
        expect(html).toContain(`--nav-index:${index}`);
        // uma única luz: a barra sobre a borda e o cone abaixo dela
        expect(html.match(/bg-limelight(?!-)/g)).toHaveLength(1);
        expect(html.match(/drop-shadow-limelight/g)).toHaveLength(1);
    });

    it("fora do Início e do Sobre, nenhuma aba ativa nem luz", () => {
        const html = renderToStaticMarkup(<Navbar />);
        expect(html).not.toContain("aria-current");
        expect(html).not.toContain("limelight");
    });

    it("tem a busca como lupa, fora do nav e sem luz própria", () => {
        const html = renderToStaticMarkup(<Navbar current="inicio" />);
        expect(html).toMatch(/<\/nav>[\s\S]*<button[^>]*aria-label="Buscar filme ou série"/);
        expect(html.match(/bg-limelight(?!-)/g)).toHaveLength(1);
    });

    it("o amarelo fica só no traço da aba ativa", () => {
        expect(renderToStaticMarkup(<Navbar />)).not.toContain("signal");
        const html = renderToStaticMarkup(<Navbar current="inicio" />);
        expect(html.match(/signal/g)).toHaveLength(1);
        expect(html).toMatch(/<li[^>]*bg-signal[^>]*drop-shadow-limelight/);
    });

    it("é componente de servidor: sem use client nem hooks", () => {
        const source = readFileSync(join(dir, "Navbar.tsx"), "utf8");
        expect(source).not.toMatch(/use client/);
        expect(source).not.toMatch(/usePathname|useState|useEffect/);
    });

    // vidro escuro sobre a pior imagem possível (branco puro): texto ativo, inativo e o cone no topo
    // vidro claro sutil sobre a pior imagem possível (branco puro), escurecida pelo
    // backdrop-brightness. A navbar tem exceção à regra de 7:1 (decisão do dono): 4,5:1 (AA).
    it("dá 4,5:1 no texto sobre o vidro, mesmo com imagem branca atrás", () => {
        const css = readFileSync(join(dir, "../../globals.css"), "utf8");
        const token = (name: string) => css.match(new RegExp(`--${name}: ([^;]+);`))![1];
        const paper = token("color-paper");
        const source = readFileSync(join(dir, "navItem.ts"), "utf8");
        const behind = (255 * Number(source.match(/backdrop-brightness-(\d+)/)![1])) / 100;
        const [r, g, b, a] = token("color-nav")
            .match(/[\d.]+/g)!
            .map(Number);
        const mix = (fg: number[], alpha: number, bg: number[]) =>
            fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
        const rgb = (c: number[]) => `rgb(${c.join(" ")})`;
        const glass = mix([r, g, b], a, [behind, behind, behind]);
        expect(contrast(paper, rgb(glass))).toBeGreaterThanOrEqual(4.5);
        expect(contrast(token("color-soft"), rgb(glass))).toBeGreaterThanOrEqual(4.5);
        // o brilho amarelo sobe do traço; atrás do rótulo vale no máximo a segunda parada
        const stops = [
            ...css
                .match(/--background-image-limelight: radial-gradient\([^;]*\);/)![0]
                .matchAll(/rgb\(([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g),
        ].map((m) => m.slice(1).map(Number));
        const [yr, yg, yb, ya] = stops[1];
        expect(contrast(paper, rgb(mix([yr, yg, yb], ya, glass)))).toBeGreaterThanOrEqual(4.5);
    });
});
