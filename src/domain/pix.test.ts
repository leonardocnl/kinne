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
});
