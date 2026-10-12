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
        ["chave desconhecida", { ...ok, ip: "1.2.3.4" }],
        ["código com tipo errado", { ...ok, browserId: 7 }],
        ["código longo demais", { ...ok, browserId: `${ok.browserId}${"0".repeat(5000)}` }],
        ["título não inteiro", { ...ok, titleId: 1.5 }],
        ["título gigante", { ...ok, titleId: 1e21 }],
        ["lista no lugar de objeto", [ok]],
    ])("recusa %s", (_, value) => {
        expect(parseUsageEvent(value)).toBeNull();
    });
});
