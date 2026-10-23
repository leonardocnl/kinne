import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Verificações sobre o código-fonte das ameaças feelings-and-taste-ui B1, B2 e group-room C1/E1.

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceFiles(dir: string): string[] {
    return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

describe("o gosto não é guardado nem cacheado (B1, B2)", () => {
    it("B2: toda função em cache remoto do gosto, do grafo e dos candidatos não recebe parâmetro", () => {
        // sem parâmetro, a chave do cache não carrega nada de quem pede
        for (const file of [
            "src/app/_data/taste-graph.ts",
            "src/app/_data/feelings.ts",
            "src/app/_data/candidates.ts",
        ]) {
            const text = read(file);
            const cached = [...text.matchAll(/function\s+(\w+)\(([^)]*)\)[^{]*\{\s*"use cache/g)];
            expect(cached.length, file).toBeGreaterThan(0);
            for (const [, name, params] of cached) {
                expect(params.trim(), `${file}: ${name}`).toBe("");
            }
        }
    });

    it("B2: nenhum arquivo que lê o gosto da pessoa usa cache", () => {
        for (const file of ["src/app/_actions/filters.ts", "src/app/_actions/surprise.ts"]) {
            expect(read(file)).not.toMatch(/use cache/);
        }
        // a pontuação e a ordem do gosto são puras: sem cache, sem estado do módulo
        for (const file of ["src/domain/draw-order.ts", "src/application/filtered-draw.ts"]) {
            expect(read(file)).not.toMatch(/use cache|^let /m);
        }
    });

    it("B1: o código que recebe o gosto não escreve console nem o corpo do pedido", () => {
        for (const file of [
            "src/app/_actions/filters.ts",
            "src/app/_actions/surprise.ts",
            "src/app/_data/filters.ts",
            "src/app/_data/surprise.ts",
            "src/app/_data/taste.ts",
            "src/app/_data/taste-graph.ts",
            "src/app/_data/feelings.ts",
            "src/application/filtered-draw.ts",
        ]) {
            expect(read(file), file).not.toMatch(/console\./);
        }
    });

    it("B1: o gosto não entra nas chamadas de medição", () => {
        for (const file of sourceFiles("src/app/_components")) {
            const text = read(file);
            for (const call of text.matchAll(/track\(([^;]*)\)/g)) {
                expect(call[1], file).not.toMatch(/taste|liked|disliked|feeling/i);
            }
        }
    });
});
