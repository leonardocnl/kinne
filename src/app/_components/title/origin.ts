import { useSyncExternalStore } from "react";
import type { Origin, StoredOrigin } from "@/domain/origin";
import type { RecommendationSource } from "@/domain/usage-events";
import { titleOrigin } from "@/infrastructure/browser-storage";

export type { Origin } from "@/domain/origin";

// A origem gravada no recommendation_shown (03); o link não tem valor próprio e fica vazio.
export const RECOMMENDATION_SOURCE = {
    dia: "daily_pick",
    filtros: "filtered",
    surpresa: "surprise_me",
    busca: "search",
    link: null,
} as const satisfies Record<Origin, RecommendationSource | null>;

// security §8: o endereço leva só o caminho.
export const titleHref = (slug: string) => `/titulo/${slug}` as const;

type Router = { push(href: string): void; replace(href: string): void };

/** Abre o título guardando na aba por onde a pessoa chegou. */
export function goToTitle(
    router: Router,
    mode: "push" | "replace",
    slug: string,
    origin: StoredOrigin,
) {
    titleOrigin.set(slug, origin);
    router[mode](titleHref(slug));
}

const noop = () => () => {};

/** A origem deste título, ou null no servidor e durante a hidratação, quando ainda não se sabe. */
export function useOrigin(slug: string): Origin | null {
    return useSyncExternalStore(
        noop,
        () => titleOrigin.read(slug),
        () => null,
    );
}
