import { describe, expect, it } from "vitest";
import { addDays, brasiliaDay, longDate, parseDay } from "./day";

describe("brasiliaDay", () => {
    it("usa o horário de Brasília, não o UTC", () => {
        expect(brasiliaDay(new Date("2026-10-11T02:59:00Z"))).toBe("2026-10-10");
        expect(brasiliaDay(new Date("2026-10-11T03:00:00Z"))).toBe("2026-10-11");
    });
});

describe("addDays", () => {
    it("atravessa meses e anos", () => {
        expect(addDays(parseDay("2026-12-31"), 1)).toBe("2027-01-01");
        expect(addDays(parseDay("2026-03-01"), -60)).toBe("2025-12-31");
    });
});

describe("parseDay", () => {
    it("recusa o que não é AAAA-MM-DD", () => {
        expect(() => parseDay("10/10/2026")).toThrow();
        expect(() => parseDay("2026-13-01")).toThrow();
    });
});

describe("longDate", () => {
    it("escreve o dia por extenso, sem -feira", () => {
        expect(longDate(parseDay("2026-10-09"))).toBe("Sexta, 9 de outubro");
        expect(longDate(parseDay("2026-10-11"))).toBe("Domingo, 11 de outubro");
    });
});
