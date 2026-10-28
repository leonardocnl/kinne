type Click = Pick<
    MouseEvent,
    "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented"
>;
type Anchor = Pick<HTMLAnchorElement, "href" | "target" | "getAttribute" | "hasAttribute">;

/**
 * Para onde o clique no link leva, quando a troca de tela passa pela cortina (RouteWipe); senão
 * null e o navegador (ou o Link) segue como sempre: clique com tecla ou botão do meio, nova aba,
 * download, âncora (#), outro site, mailto:, tel:, javascript: e a própria página.
 */
export function wipeHref(
    click: Click,
    anchor: Anchor,
    location: Pick<Location, "origin" | "pathname">,
) {
    if (click.defaultPrevented || click.button !== 0) return null;
    if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return null;
    const raw = anchor.getAttribute("href");
    if (!raw || raw.startsWith("#") || anchor.hasAttribute("download")) return null;
    if (anchor.target && anchor.target !== "_self") return null;
    const url = new URL(anchor.href);
    // mailto:, tel: e javascript: têm origem "null"
    if (url.origin !== location.origin || url.pathname === location.pathname) return null;
    return url.pathname + url.search + url.hash;
}
