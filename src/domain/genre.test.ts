import { describe, expect, it } from "vitest";
import { mainGenre } from "./genre";

describe("mainGenre", () => {
    it("prefere o gênero mais específico e deixa drama por último", () => {
        expect(mainGenre(["drama", "romance"])).toBe("romance");
        expect(mainGenre(["drama", "suspense", "action"])).toBe("action");
        expect(mainGenre(["drama"])).toBe("drama");
        expect(mainGenre([])).toBeNull();
    });
});
