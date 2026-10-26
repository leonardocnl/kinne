import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AsciiHorizon, horizonRows } from "./AsciiHorizon";

describe("AsciiHorizon", () => {
    it("desenha o mesmo horizonte em todo render, mais denso embaixo e no centro", () => {
        expect(horizonRows(1)).toBe(horizonRows(1));
        expect(horizonRows(1)).not.toBe(horizonRows(2));
        const lines = horizonRows(1, 60, 10).split("\n");
        expect(lines).toHaveLength(10);
        const ink = (s: string) => s.replace(/ /g, "").length;
        expect(ink(lines[9].slice(20, 40))).toBeGreaterThan(ink(lines[0].slice(20, 40)));
        expect(ink(lines[9].slice(20, 40))).toBeGreaterThan(ink(lines[9].slice(0, 10)));
    });

    it("é decorativo e de servidor: sem use client", () => {
        expect(renderToStaticMarkup(<AsciiHorizon />)).toContain('aria-hidden="true"');
        const source = readFileSync(join(import.meta.dirname, "AsciiHorizon.tsx"), "utf8");
        expect(source).not.toMatch(/use client|useEffect|useState/);
    });
});
