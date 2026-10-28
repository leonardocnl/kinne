import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CastDialog } from "./CastDialog";

const render = (cast: { name: string; character: string | null }[]) =>
    renderToStaticMarkup(<CastDialog title="Filme" poster={null} cast={cast} />);

const firstRow = (html: string) => html.match(/<li[^>]*>.*?<\/li>/)?.[0] ?? "";

describe("CastDialog (US004 C12)", () => {
    it("é um diálogo modal com o título associado e o fechar nomeado", () => {
        const html = render([{ name: "Ator", character: null }]);
        const labelledby = html.match(/aria-labelledby="([^"]+)"/)?.[1];
        expect(html).toContain('aria-modal="true"');
        expect(html).toContain(`id="${labelledby}"`);
        expect(html).toContain("Elenco · 1 nome");
        expect(html).toContain('aria-label="Fechar elenco"');
    });

    it("com personagem, ator e personagem na mesma linha, nessa ordem, o personagem em signal", () => {
        const row = firstRow(render([{ name: "Ana Atriz", character: "Rainha" }]));
        expect(row.indexOf("01")).toBeLessThan(row.indexOf("Ana Atriz"));
        expect(row.indexOf("Ana Atriz")).toBeLessThan(row.indexOf("Rainha"));
        expect(row.match(/text-signal/g)).toHaveLength(1);
        expect(row).toMatch(/text-signal[^>]*>Rainha</);
    });

    it("sem personagem, a linha só tem o ator, sem coluna vazia nem travessão", () => {
        const row = firstRow(render([{ name: "Ana Atriz", character: null }]));
        expect(row).not.toContain("text-signal");
        expect(row).not.toContain("—");
        expect(row.match(/<span/g)).toHaveLength(3);
    });

    it("o amarelo só aparece nos personagens", () => {
        const html = render([
            { name: "A", character: "X" },
            { name: "B", character: null },
            { name: "C", character: "Z" },
        ]);
        expect(html.match(/signal/g)).toHaveLength(2);
    });

    it("só usa cores dos tokens, sem valor arbitrário nem estilo inline", () => {
        const html = render([{ name: "A", character: "X" }]);
        expect(html).not.toMatch(/-\[|-\(--|style=/);
        const css = readFileSync(join(import.meta.dirname, "../../globals.css"), "utf8");
        const tokens = new Set([
            ...[...css.matchAll(/--(?:color|text)-([a-z0-9-]+):/g)].map((m) => m[1]),
            ...["transparent", "balance", "t", "linear-to-b"],
        ]);
        const used = [...html.matchAll(/\b(?:text|bg|border|from|to)-([a-z-]+)/g)].map((m) => m[1]);
        expect(used.filter((c) => !tokens.has(c))).toEqual([]);
    });
});
