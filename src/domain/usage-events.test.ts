import { describe, expect, it } from "vitest";
import { parseUsageEvent } from "./usage-events";

const ok = {
    browserId: "0b7c5a52-3f0e-4c1e-9d55-8f1a3c2b6e71",
    name: "recommendation_shown",
    source: "filtered",
    titleId: 42,
};

describe("parseUsageEvent", () => {
    it("aceita os seis eventos do 03, com a origem só em recommendation_shown", () => {
        expect(parseUsageEvent(ok)).toEqual(ok);
        expect(parseUsageEvent({ ...ok, name: "app_opened", source: null, titleId: null })).toEqual(
            { ...ok, name: "app_opened", source: null, titleId: null },
        );
        // aberto por link: mostrado, sem origem
        expect(parseUsageEvent({ ...ok, source: null })?.source).toBeNull();
    });

    it.each([
        ["nada", null],
        ["código que não é uuid", { ...ok, browserId: "abc" }],
        ["evento desconhecido", { ...ok, name: "page_view" }],
        ["origem desconhecida", { ...ok, source: "link" }],
        ["origem em outro evento", { ...ok, name: "trailer_opened" }],
        ["título que não é inteiro positivo", { ...ok, titleId: 0 }],
        ["campo faltando", { ...ok, titleId: undefined }],
    ])("recusa %s", (_, value) => {
        expect(parseUsageEvent(value)).toBeNull();
    });
});
