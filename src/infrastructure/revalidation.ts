import "server-only";
import { z } from "zod";
import { MAX_SLUG_LENGTH } from "@/domain/catalog";

// Etiquetas do cache do catálogo (C4). "catalog" está em tudo; "catalog:lists" nas listas
// (candidatos e tela inicial); "title:<slug>" na página de cada título.
export const CATALOG_TAG = "catalog";
export const LISTS_TAG = "catalog:lists";
export const titleTag = (slug: string) => `title:${slug}`;

export const MAX_TAGS_PER_REQUEST = 100;
// Acima disso (a primeira carga, por exemplo) é mais barato invalidar o catálogo todo.
const MAX_TITLE_TAGS = 500;

export const REVALIDATE_PATH = "/api/revalidate";
export const REVALIDATE_SECRET_HEADER = "x-revalidate-secret";

const tag = z
    .string()
    .max(MAX_SLUG_LENGTH + 6)
    .regex(/^(catalog|catalog:lists|title:[a-z0-9]+(-[a-z0-9]+)*)$/);

// C8: corpo estrito, chaves desconhecidas recusadas.
export const revalidateBodySchema = z.strictObject({
    tags: z.array(tag).min(1).max(MAX_TAGS_PER_REQUEST),
});

export function tagsFor(changedSlugs: readonly string[]): string[][] {
    if (changedSlugs.length === 0) return [];
    if (changedSlugs.length > MAX_TITLE_TAGS) return [[CATALOG_TAG]];
    const tags = [LISTS_TAG, ...changedSlugs.map(titleTag)];
    return Array.from({ length: Math.ceil(tags.length / MAX_TAGS_PER_REQUEST) }, (_, i) =>
        tags.slice(i * MAX_TAGS_PER_REQUEST, (i + 1) * MAX_TAGS_PER_REQUEST),
    );
}

// Chamado pela carga, no fim. Devolve quantas requisições deram certo.
export async function requestRevalidation(
    origin: string,
    secret: string,
    changedSlugs: readonly string[],
): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (const tags of tagsFor(changedSlugs)) {
        const res = await fetch(origin + REVALIDATE_PATH, {
            method: "POST",
            headers: { "content-type": "application/json", [REVALIDATE_SECRET_HEADER]: secret },
            body: JSON.stringify({ tags }),
            signal: AbortSignal.timeout(15_000),
            redirect: "error",
        }).catch(() => null);
        if (res?.ok) sent++;
        else failed++;
    }
    return { sent, failed };
}
