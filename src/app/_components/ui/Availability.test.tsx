import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { availableStreamings } from "@/domain/streaming";
import { Availability } from "./Availability";

describe("Availability", () => {
    it("mostra o rótulo e cada streaming, na ordem fixa", () => {
        const html = renderToStaticMarkup(
            <Availability streamings={availableStreamings([119, 8, 1899])} />,
        );
        expect(html).toContain("Onde assistir");
        expect(html.match(/<li/g)).toHaveLength(3);
        expect(html.indexOf("Netflix")).toBeLessThan(html.indexOf("Max"));
        expect(html.indexOf("Max")).toBeLessThan(html.indexOf("Prime Video"));
        expect(html).not.toContain("signal");
    });

    it("sem streaming, nada aparece", () => {
        expect(renderToStaticMarkup(<Availability streamings={[]} />)).toBe("");
    });
});
