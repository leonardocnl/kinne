// Pedido de cortina (RouteWipe) por evento: quem troca de título não precisa saber se ela existe.
export const WIPE_EVENT = "kinne:wipe";

/** Pede a cortina até `href`; true se o RouteWipe aceitou (computador, sem movimento reduzido). */
export function requestWipe(href: string) {
    return !window.dispatchEvent(new CustomEvent(WIPE_EVENT, { detail: href, cancelable: true }));
}

type Router = { push(href: string): void; replace(href: string): void };

/** O roteador com o `replace` pela cortina, quando ela existe; sem ela, a troca é imediata. */
export function wipeRouter(router: Router): Router {
    return {
        push: (href) => router.push(href),
        replace: (href) => {
            if (!requestWipe(href)) router.replace(href);
        },
    };
}
