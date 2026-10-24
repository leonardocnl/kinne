import { describe, expect, it } from "vitest";
import { migrationsBehind, migrationTargetAllowed } from "./migration-guard";

describe("migrationTargetAllowed", () => {
    it("aceita só develop", () => {
        expect(migrationTargetAllowed("develop")).toBe(true);
    });

    it("recusa production", () => {
        expect(migrationTargetAllowed("production")).toBe(false);
    });

    it("recusa valor ausente", () => {
        expect(migrationTargetAllowed(null)).toBe(false);
        expect(migrationTargetAllowed(undefined)).toBe(false);
    });

    it("recusa valor vazio", () => {
        expect(migrationTargetAllowed("")).toBe(false);
        expect(migrationTargetAllowed(" ")).toBe(false);
    });

    it("recusa variações de caixa ou espaço", () => {
        expect(migrationTargetAllowed("Develop")).toBe(false);
        expect(migrationTargetAllowed("develop ")).toBe(false);
    });
});

describe("migrationsBehind", () => {
    it("não acusa atraso quando o banco tem todas", () => {
        expect(migrationsBehind(11, 11)).toBe(false);
        expect(migrationsBehind(12, 11)).toBe(false);
    });

    it("acusa atraso quando faltam migrations", () => {
        expect(migrationsBehind(10, 11)).toBe(true);
        expect(migrationsBehind(0, 11)).toBe(true);
    });

    it("trata contagem inválida como atraso", () => {
        expect(migrationsBehind(Number.NaN, 11)).toBe(true);
    });
});
