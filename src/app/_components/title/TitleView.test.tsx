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
    backdropWidth: null,
    recommendable: true,
    direction: "Direção de Jordan Peele",
    cast: null,
};

describe("TitleView", () => {
    it("US004 C1: onde assistir vem logo abaixo do título, antes da chamada e da sinopse", () => {
        const html = renderToStaticMarkup(<TitleView title={title} daily={null} />);
        const at = (text: string) => html.indexOf(text);
        expect(at("Onde assistir")).toBeGreaterThan(at("Corra!</h1>"));
        expect(at("Onde assistir")).toBeLessThan(at(title.tagline!));
        expect(at("Onde assistir")).toBeLessThan(at(title.synopsis!));
        expect(at("Netflix")).toBeLessThan(at("Max"));
        expect(at("Max")).toBeLessThan(at("Prime Video"));
    });

    it("sem streaming, sem a linha", () => {
        const html = renderToStaticMarkup(
            <TitleView title={{ ...title, streamings: [] }} daily={null} />,
        );
        expect(html).not.toContain("Onde assistir");
    });
});
