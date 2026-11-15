// Pedido de cortina (RouteWipe) por evento: quem troca de título não precisa saber se ela existe.
export const WIPE_EVENT = "kinne:wipe";
export const WIPE_CANCEL_EVENT = "kinne:wipe-cancel";

const ask = (href: string | null) =>
    !window.dispatchEvent(new CustomEvent(WIPE_EVENT, { detail: href, cancelable: true }));

/** Começa a cortina já no clique, antes de saber o destino (o sorteio ainda vai ao servidor). */
export const beginWipe = () => ask(null);

/** O sorteio não levou a outro título: a cortina começada sai sem trocar a tela. */
export const cancelWipe = () => window.dispatchEvent(new Event(WIPE_CANCEL_EVENT));

/** Pede a cortina até `href`; true se o RouteWipe aceitou (computador, sem movimento reduzido). */
export const requestWipe = (href: string) => ask(href);

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
