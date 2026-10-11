import { describe, expect, it } from "vitest";
import type { Day } from "@/domain/day";
import { brasiliaMidnight, eventRange, parseDeleteEventsArgs } from "./delete-test-events";

const day = (value: string) => value as Day;

describe("parseDeleteEventsArgs", () => {
    it("lê o intervalo e é ensaio por padrão", () => {
        expect(parseDeleteEventsArgs(["--from", "2026-10-26", "--to", "2026-11-01"])).toEqual({
            from: "2026-10-26",
            to: "2026-11-01",
            confirm: false,
        });
    });

    it("aceita --flag=valor, --confirm e qualquer ordem", () => {
        expect(
            parseDeleteEventsArgs(["--confirm", "--to=2026-11-01", "--from=2026-10-26"]),
        ).toEqual({ from: "2026-10-26", to: "2026-11-01", confirm: true });
    });

    it("aceita um dia só", () => {
        expect(parseDeleteEventsArgs(["--from", "2026-10-26", "--to", "2026-10-26"]).to).toBe(
            "2026-10-26",
        );
    });

    it.each([
        ["sem argumentos", []],
        ["sem --to", ["--from", "2026-10-26"]],
        ["--from sem valor", ["--to", "2026-11-01", "--from"]],
        ["formato errado", ["--from", "26/10/2026", "--to", "2026-11-01"]],
        ["dia que não existe", ["--from", "2026-02-30", "--to", "2026-03-01"]],
        ["mês que não existe", ["--from", "2026-13-01", "--to", "2026-13-02"]],
        ["--from depois de --to", ["--from", "2026-11-02", "--to", "2026-11-01"]],
        ["argumento desconhecido", ["--from", "2026-10-26", "--to", "2026-11-01", "--yes"]],
        ["--confirm com valor", ["--from", "2026-10-26", "--to", "2026-11-01", "--confirm=no"]],
        ["flag repetida", ["--from", "2026-10-26", "--from", "2026-10-27", "--to", "2026-11-01"]],
    ])("recusa %s", (_, argv) => {
        expect(() => parseDeleteEventsArgs(argv)).toThrow();
    });
});

describe("eventRange", () => {
    it("começa à meia-noite de Brasília (UTC-3)", () => {
        expect(brasiliaMidnight(day("2026-10-26")).toISOString()).toBe("2026-10-26T03:00:00.000Z");
    });

    it("inclui o dia de --to inteiro, terminando antes da meia-noite seguinte", () => {
        const { start, end } = eventRange(day("2026-10-26"), day("2026-11-01"));
        expect(start.toISOString()).toBe("2026-10-26T03:00:00.000Z");
        expect(end.toISOString()).toBe("2026-11-02T03:00:00.000Z");
    });

    it("vira o mês e o ano", () => {
        expect(eventRange(day("2026-12-31"), day("2026-12-31")).end.toISOString()).toBe(
            "2027-01-01T03:00:00.000Z",
        );
    });
});
