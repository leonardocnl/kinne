import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { availableStreamings, STREAMING_LOGOS } from "@/domain/streaming";
import { AvailabilityLogos } from "./AvailabilityLogos";

describe("AvailabilityLogos", () => {
    it("mostra o logo do TMDB e o nome de cada streaming, na ordem fixa", () => {
        const html = renderToStaticMarkup(
            <AvailabilityLogos
                streamings={availableStreamings([119, 8]).map((s) => ({
                    ...s,
                    logoPath: STREAMING_LOGOS[s.id],
                }))}
            />,
        );
        expect(html).toContain("Onde assistir");
        expect(html).toContain(
            'src="https://image.tmdb.org/t/p/w92/rK1KljqmbvO9HQa1PBFLILWah72.png"',
        );
        expect(html).toContain(
            "https://image.tmdb.org/t/p/w185/gMZdpavHmxFNnLpMHwVxfqeux2g.png 2x",
        );
        expect(html.indexOf("Netflix")).toBeLessThan(html.indexOf("Prime Video"));
        expect(html).not.toContain("signal");
    });

    it("sem logo conhecido, só o nome em texto", () => {
        const html = renderToStaticMarkup(
            <AvailabilityLogos streamings={[{ id: "x", name: "Outro", logoPath: null }]} />,
        );
        expect(html).toContain("Outro");
        expect(html).not.toContain("<img");
    });

    it("sem streaming, nada aparece", () => {
        expect(renderToStaticMarkup(<AvailabilityLogos streamings={[]} />)).toBe("");
    });
});
