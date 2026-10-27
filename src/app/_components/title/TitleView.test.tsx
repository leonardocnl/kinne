import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { availableStreamings, STREAMING_LOGOS } from "@/domain/streaming";
import type { TitleScreen } from "../../_data/title";
import { TitleView } from "./TitleView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, replace() {} }) }));

const title: TitleScreen = {
    id: 1,
    slug: "corra-2017",
    title: "Corra!",
    tagline: "Um fim de semana que esconde algo errado.",
    synopsis: "Chris, um fotógrafo, vai passar o fim de semana com a família da namorada.",
    genre: "Suspense",
    facts: ["2017", "1h 44min"],
    score: "7,6",
    streamings: availableStreamings([119, 1899, 8]).map((s) => ({
        ...s,
        logoPath: STREAMING_LOGOS[s.id],
    })),
    trailerUrl: null,
    backdropImagePath: null,
    posterImagePath: null,
    backdropWidth: null,
    recommendable: true,
    direction: "Direção de Jordan Peele",
    cast: null,
};

describe("TitleView", () => {
    const render = (t: TitleScreen) => renderToStaticMarkup(<TitleView title={t} daily={null} />);

    it("US004 C1: onde assistir vem antes do título (celular), da chamada e da sinopse", () => {
        const html = render(title);
        const at = (text: string) => html.indexOf(text);
        expect(at("Onde assistir")).toBeGreaterThan(-1);
        expect(at("Onde assistir")).toBeLessThan(at("<h1"));
        expect(at("<h1")).toBeLessThan(at(title.tagline!));
        expect(at(title.tagline!)).toBeLessThan(at(title.synopsis!));
        expect(at("Netflix")).toBeLessThan(at("Max"));
        expect(at("Max")).toBeLessThan(at("Prime Video"));
    });

    it("sem streaming, sem onde assistir", () => {
        expect(render({ ...title, streamings: [] })).not.toContain("Onde assistir");
    });

    it("pôster grande só quando há caminho, escondido no celular", () => {
        expect(render(title)).not.toContain("/w342");
        const html = render({ ...title, posterImagePath: "/p.jpg" });
        expect(html).toContain('src="https://image.tmdb.org/t/p/w342/p.jpg"');
        expect(html).toContain("https://image.tmdb.org/t/p/w500/p.jpg 500w");
        expect(html).toMatch(/<img[^>]*w342\/p\.jpg[^>]*loading="lazy"/);
        expect(html).toMatch(
            /<img[^>]*class="[^"]*\bhidden\b[^"]*desktop:block[^"]*"[^>]*w342|<img[^>]*w342[^>]*class="[^"]*\bhidden\b/,
        );
    });
});
