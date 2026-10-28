import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { availableStreamings } from "@/domain/streaming";
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
    streamings: availableStreamings([119, 1899, 8]),
    trailerUrl: null,
    backdropImagePath: null,
    posterImagePath: null,
    backdropWidth: null,
    recommendable: true,
    direction: "Direção de Jordan Peele",
    fullCast: [],
};

describe("TitleView", () => {
    const render = (t: TitleScreen) => renderToStaticMarkup(<TitleView title={t} daily={null} />);

    it("US004 C1: onde assistir vem logo abaixo do título, antes da chamada e da sinopse", () => {
        const html = render(title);
        const at = (text: string) => html.indexOf(text);
        expect(at("Onde assistir")).toBeGreaterThan(at("</h1>"));
        expect(at("Onde assistir")).toBeLessThan(at(title.tagline!));
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

    it("US004 C12: com elenco, o botão Elenco abre o vidro com todos, na ordem", () => {
        const fullCast = ["Ana", "Bia", "Caio", "Davi"];
        const html = render({ ...title, fullCast });
        expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Elenco<\/button>/);
        expect(html).toContain("4 nomes");
        const at = (name: string) => html.indexOf(name);
        expect(at("Ana")).toBeLessThan(at("Bia"));
        expect(at("Caio")).toBeLessThan(at("Davi"));
    });

    it("direção na linha dos dados; sem elenco, sem botão", () => {
        const html = render(title);
        expect(html).toContain("Direção de Jordan Peele");
        expect(html.indexOf("2017")).toBeLessThan(html.indexOf("Direção de Jordan Peele"));
        expect(html).not.toContain("<dialog");
    });
});
