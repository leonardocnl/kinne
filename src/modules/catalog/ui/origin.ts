"use client";

import { useSyncExternalStore } from "react";
import type { Origin, StoredOrigin } from "../domain/origin";
import { titleOrigin } from "../infrastructure/browser/title-origin";

export type { Origin } from "../domain/origin";

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
