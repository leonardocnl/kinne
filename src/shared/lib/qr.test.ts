import { describe, expect, it } from "vitest";
import { encodeQr, QR_MAX_BYTES, qrByteCapacity } from "./qr";

// A matriz de referência vem de uma biblioteca independente (qrcode 8, Python, nível M, máscara 1)
// para este mesmo texto: o nosso gerador, forçando a máscara 1, tem de dar exatamente os mesmos
// módulos (dados, correção de erro, formato). Os códigos de 19 tamanhos, das versões 1 a 10,
// também foram lidos de volta por um decodificador (OpenCV) na hora de escrever o gerador.
const URL = "https://kinne.app/sala/ABCD2345";
const REFERENCE = [
    "11111110111011110010101111111",
    "10000010010010010110101000001",
    "10111010111001000101101011101",
    "10111010010100011010001011101",
    "10111010011010011110001011101",
    "10000010100011101000001000001",
    "11111110101010101010101111111",
    "00000000011001000010100000000",
    "10100011000101011100100100101",
    "00110001100110001001101100011",
    "00000110000111101011001101101",
    "00010001101110111000010111000",
    "01000011001101100101111100001",
    "01011100000001100001101100011",
    "10001010111100010011000100001",
    "00000000111111000011001110000",
    "10011110111101011101001100001",
    "01100000001110001001101100111",
    "11010011011001101101011011001",
    "00111001110010111001110010000",
    "11010110110101101010111111010",
    "00000000101011100010100011101",
    "11111110101010010010101010001",
    "10000010001011001000100010011",
    "10111010011011010011111111000",
    "10111010011110010010010011110",
    "10111010110001111011100010011",
    "10000010000000101011100111000",
    "11111110100111010010111101001",
];

const rows = (qr: ReturnType<typeof encodeQr>) => qr.modules.map((r) => r.map(Number).join(""));

describe("encodeQr", () => {
    it("dá os mesmos módulos que uma implementação independente (máscara 1)", () => {
        expect(rows(encodeQr(URL, 1))).toEqual(REFERENCE);
    });

    it("o tamanho segue a versão: 21 + 4 por versão a mais", () => {
        expect(encodeQr("a").size).toBe(21);
        expect(encodeQr(URL).size).toBe(29);
        expect(encodeQr("x".repeat(QR_MAX_BYTES)).size).toBe(57);
    });

    it("tem os três localizadores, o padrão de tempo e o módulo escuro fixo", () => {
        const qr = encodeQr(URL);
        const at = (r: number, c: number) => qr.modules[r][c];
        for (const [r, c] of [
            [0, 0],
            [0, qr.size - 7],
            [qr.size - 7, 0],
        ]) {
            expect(at(r, c)).toBe(true);
            expect(at(r + 3, c + 3)).toBe(true);
            expect(at(r + 1, c + 1)).toBe(false);
        }
        for (let i = 8; i < qr.size - 8; i++) {
            expect(at(6, i)).toBe(i % 2 === 0);
            expect(at(i, 6)).toBe(i % 2 === 0);
        }
        expect(at(qr.size - 8, 8)).toBe(true);
    });

    it("é determinístico", () => {
        expect(rows(encodeQr(URL))).toEqual(rows(encodeQr(URL)));
    });

    it("escolhe a menor versão em que o texto cabe", () => {
        for (let version = 1; version <= 10; version++) {
            const capacity = qrByteCapacity(version);
            expect(encodeQr("a".repeat(capacity)).size).toBe(17 + 4 * version);
        }
    });

    it("recusa o que não cabe na versão 10", () => {
        expect(() => encodeQr("a".repeat(QR_MAX_BYTES + 1))).toThrow(RangeError);
    });

    it("aceita acentos e emoji (UTF-8)", () => {
        expect(encodeQr("Olá 🎬").size).toBeGreaterThanOrEqual(21);
    });
});
