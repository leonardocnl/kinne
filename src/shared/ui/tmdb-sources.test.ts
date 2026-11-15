import { describe, expect, it } from "vitest";
import { backdropSources, posterSources, thumbnailSources } from "./tmdb-sources";

const base = "https://image.tmdb.org/t/p/";

describe("backdropSources", () => {
    it("oferece w780, w1280 e o original com a largura real", () => {
        expect(backdropSources("/a.jpg", 3840)).toEqual({
            src: `${base}original/a.jpg`,
            srcSet: `${base}w780/a.jpg 780w, ${base}w1280/a.jpg 1280w, ${base}original/a.jpg 3840w`,
        });
    });

    it("não oferece passos maiores que o original", () => {
        expect(backdropSources("/a.jpg", 1280).srcSet).toBe(
            `${base}w780/a.jpg 780w, ${base}original/a.jpg 1280w`,
        );
        expect(backdropSources("/a.jpg", 700).srcSet).toBe(`${base}original/a.jpg 700w`);
    });

    it("sem a largura, fica nos tamanhos fixos", () => {
        expect(backdropSources("/a.jpg", null)).toEqual({
            src: `${base}w1280/a.jpg`,
            srcSet: `${base}w780/a.jpg 780w, ${base}w1280/a.jpg 1280w`,
        });
    });
});

describe("posterSources", () => {
    it("usa w92 e w185 para telas 2x", () => {
        expect(posterSources("/p.jpg")).toEqual({
            src: `${base}w92/p.jpg`,
            srcSet: `${base}w92/p.jpg 1x, ${base}w185/p.jpg 2x`,
        });
    });
});

describe("thumbnailSources", () => {
    it("usa w300 e w780", () => {
        expect(thumbnailSources("/t.jpg").srcSet).toBe(
            `${base}w300/t.jpg 300w, ${base}w780/t.jpg 780w`,
        );
    });
});
