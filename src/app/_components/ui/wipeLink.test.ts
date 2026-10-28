import { describe, expect, it } from "vitest";
import { wipeHref } from "./wipeLink";

const here = { origin: "https://kinne.app", pathname: "/" };
const click = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
};
const anchor = (href: string, attrs: Record<string, string> = {}) => ({
    href: new URL(href, `${here.origin}${here.pathname}`).href,
    target: attrs.target ?? "",
    getAttribute: (name: string) => (name === "href" ? href : (attrs[name] ?? null)),
    hasAttribute: (name: string) => name in attrs,
});

describe("wipeHref: o que passa pela cortina", () => {
    it.each([
        ["/sobre", "/sobre"],
        ["/titulo/suzume-2022", "/titulo/suzume-2022"],
        ["/sobre#apoie", "/sobre#apoie"],
        ["https://kinne.app/perguntas", "/perguntas"],
    ])("link interno %s anima", (href, path) => {
        expect(wipeHref(click, anchor(href), here)).toBe(path);
    });

    it.each([
        "#apoie",
        "/",
        "/#topo",
        "https://www.linkedin.com/in/leonardocnl",
        "//github.com/leonardocnl",
        "mailto:oi@kinne.app",
        "tel:+5535999999999",
        "javascript:void(0)",
    ])("%s não anima", (href) => {
        expect(wipeHref(click, anchor(href), here)).toBeNull();
    });

    it("nova aba e download não animam; _self anima", () => {
        expect(wipeHref(click, anchor("/sobre", { target: "_blank" }), here)).toBeNull();
        expect(wipeHref(click, anchor("/sobre", { download: "" }), here)).toBeNull();
        expect(wipeHref(click, anchor("/sobre", { target: "_self" }), here)).toBe("/sobre");
    });

    it.each(["metaKey", "ctrlKey", "shiftKey", "altKey", "defaultPrevented"] as const)(
        "com %s não anima",
        (key) => {
            expect(wipeHref({ ...click, [key]: true }, anchor("/sobre"), here)).toBeNull();
        },
    );

    it("botão do meio não anima", () => {
        expect(wipeHref({ ...click, button: 1 }, anchor("/sobre"), here)).toBeNull();
    });
});
