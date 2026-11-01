import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { crc16, PIX, pixPayload } from "./pix";

const payload = pixPayload();

describe("CRC16-CCITT", () => {
    it("bate com o valor de referência do algoritmo", () => {
        expect(crc16("123456789")).toBe("29B1");
    });

    it("o payload termina com o CRC dos caracteres anteriores", () => {
        expect(payload.slice(-8, -4)).toBe("6304");
        expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
    });
});

describe("BR Code Pix estático", () => {
    it("traz a chave, o nome e a cidade das constantes", () => {
        expect(payload).toContain(`br.gov.bcb.pix0136${PIX.key}`);
        expect(payload).toContain(`59${PIX.name.length}${PIX.name}`);
        expect(payload).toContain(`60${String(PIX.city.length).padStart(2, "0")}${PIX.city}`);
    });

    it("segue os campos fixos do estático, sem valor", () => {
        expect(payload.startsWith("000201010211")).toBe(true);
        expect(payload).toContain("52040000" + "5303986" + "5802BR");
        expect(payload).toContain("62070503***6304");
    });

    it("respeita os limites do EMV: nome até 25 e cidade até 15", () => {
        expect(PIX.name.length).toBeLessThanOrEqual(25);
        expect(PIX.city.length).toBeLessThanOrEqual(15);
    });
});

describe("public/pix-qr.svg", () => {
    const svg = readFileSync(join(import.meta.dirname, "../../public/pix-qr.svg"), "utf8");

    it("foi gerado do payload atual (<desc>) e esse payload tem o CRC certo", () => {
        const embedded = /<desc id="d">([^<]+)<\/desc>/.exec(svg)?.[1];
        expect(embedded).toBe(payload);
        expect(embedded!.slice(-4)).toBe(crc16(embedded!.slice(0, -4)));
    });

    // The image, not <desc>, is what a banking app reads: it defines where payments go.
    it("decodes to exactly pixPayload()", () => {
        expect(decodeQrVersion7M(svg)).toBe(payload);
    });
});

/**
 * Reads the modules drawn in the SVG and decodes them per ISO/IEC 18004, independently of the
 * generator and of src/domain/qr.ts. Only what this file needs: version 7, level M, and the three
 * segment modes the generator uses. It throws on anything else, so a regenerated QR of another shape fails here instead of passing.
 */
function decodeQrVersion7M(svg: string): string {
    const QUIET = 4;
    const SIZE = 45;
    const dark = new Set(
        [...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(
            (m) => `${Number(m[2]) - QUIET},${Number(m[1]) - QUIET}`,
        ),
    );
    if (!svg.includes(`viewBox="0 0 ${SIZE + 2 * QUIET} ${SIZE + 2 * QUIET}"`)) {
        throw new Error("not a version 7 symbol");
    }
    const at = (r: number, c: number) => dark.has(`${r},${c}`);

    const formatCells = [
        ...[0, 1, 2, 3, 4, 5, 7, 8].map((c) => [8, c]),
        ...[7, 5, 4, 3, 2, 1, 0].map((r) => [r, 8]),
    ];
    const format = formatCells.reduce((bits, [r, c]) => (bits << 1) | Number(at(r, c)), 0) ^ 0x5412;
    if (format >> 13 !== 0) throw new Error("not error correction level M");
    const mask = [
        (r: number, c: number) => (r + c) % 2 === 0,
        (r: number) => r % 2 === 0,
        (_: number, c: number) => c % 3 === 0,
        (r: number, c: number) => (r + c) % 3 === 0,
        (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
        (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
        (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
    ][(format >> 10) & 7];

    const isAlignment = (r: number, c: number) => {
        const centers = [6, 22, 38];
        return centers.some((cr) =>
            centers.some(
                (cc) =>
                    !(cr === 6 && cc === 6) &&
                    !(cr === 6 && cc === 38) &&
                    !(cr === 38 && cc === 6) &&
                    Math.abs(r - cr) <= 2 &&
                    Math.abs(c - cc) <= 2,
            ),
        );
    };
    const isFunction = (r: number, c: number) =>
        r === 6 ||
        c === 6 ||
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= SIZE - 8) ||
        (r >= SIZE - 8 && c <= 8) ||
        (r <= 5 && c >= SIZE - 11) || // version information
        (c <= 5 && r >= SIZE - 11) ||
        isAlignment(r, c);

    const bits: number[] = [];
    let upward = true;
    for (let right = SIZE - 1; right > 0; right -= 2) {
        if (right === 6) right = 5;
        for (let i = 0; i < SIZE; i++) {
            const r = upward ? SIZE - 1 - i : i;
            for (const c of [right, right - 1]) {
                if (!isFunction(r, c)) bits.push(Number(at(r, c) !== mask(r, c)));
            }
        }
        upward = !upward;
    }

    // Version 7-M: 4 blocks of 31 data codewords, interleaved one codeword at a time.
    const BLOCKS = 4;
    const PER_BLOCK = 31;
    const codewords = Array.from({ length: BLOCKS * PER_BLOCK }, (_, i) =>
        bits.slice(i * 8, i * 8 + 8).reduce((byte, bit) => (byte << 1) | bit, 0),
    );
    const data: number[] = [];
    for (let block = 0; block < BLOCKS; block++) {
        for (let i = 0; i < PER_BLOCK; i++) data.push(codewords[i * BLOCKS + block]);
    }
    const stream = data.flatMap((byte) =>
        Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1),
    );
    const read = (from: number, length: number) =>
        stream.slice(from, from + length).reduce((value, bit) => (value << 1) | bit, 0);
    // The generator splits the content into numeric, alphanumeric and byte segments.
    const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
    let text = "";
    let cursor = 0;
    for (;;) {
        const mode = read(cursor, 4);
        cursor += 4;
        if (mode === 0) return text;
        if (mode === 0b0001) {
            let left = read(cursor, 10);
            cursor += 10;
            while (left > 0) {
                const digits = Math.min(left, 3);
                const size = [0, 4, 7, 10][digits];
                text += String(read(cursor, size)).padStart(digits, "0");
                cursor += size;
                left -= digits;
            }
        } else if (mode === 0b0010) {
            let left = read(cursor, 9);
            cursor += 9;
            while (left > 0) {
                if (left === 1) {
                    text += ALPHANUMERIC[read(cursor, 6)];
                    cursor += 6;
                    left = 0;
                } else {
                    const pair = read(cursor, 11);
                    text += ALPHANUMERIC[Math.floor(pair / 45)] + ALPHANUMERIC[pair % 45];
                    cursor += 11;
                    left -= 2;
                }
            }
        } else if (mode === 0b0100) {
            const length = read(cursor, 8);
            cursor += 8;
            const bytes = Array.from({ length }, (_, i) => read(cursor + i * 8, 8));
            text += Buffer.from(bytes).toString("utf8");
            cursor += length * 8;
        } else {
            throw new Error(`unexpected segment mode ${mode}`);
        }
    }
}
