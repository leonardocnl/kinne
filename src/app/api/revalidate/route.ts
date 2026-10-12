import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { REVALIDATE_SECRET_HEADER, revalidateBodySchema } from "@/infrastructure/revalidation";

// Invalidação do cache do catálogo, chamada pela carga no fim de cada execução (C4). Superfície
// pública (C8): só POST, segredo no cabeçalho comparado em tempo constante, corpo estrito,
// limite de taxa e 404 para qualquer outra coisa (inclusive segredo errado).

const MAX_BODY_BYTES = 16 * 1024;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
// ponytail: limite por instância, em memória; mover para um token bucket no Postgres (security §7)
// se o endpoint passar a ser alvo. O segredo de 32 bytes já torna força bruta inviável.
let windowStart = 0;
let hits = 0;

const notFound = () => new Response(null, { status: 404 });

function sameSecret(given: string | null): boolean {
    const expected = process.env.REVALIDATE_SECRET;
    if (!expected || !given) return false;
    // Hash dos dois lados: mesmo tamanho, comparação sem vazar o comprimento.
    const digest = (s: string) => createHash("sha256").update(s).digest();
    return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request: Request): Promise<Response> {
    const now = Date.now();
    if (now - windowStart > WINDOW_MS) {
        windowStart = now;
        hits = 0;
    }
    if (++hits > MAX_PER_WINDOW) return new Response(null, { status: 429 });

    if (!sameSecret(request.headers.get(REVALIDATE_SECRET_HEADER))) return notFound();
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return notFound();
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return notFound();
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        return notFound();
    }
    const body = revalidateBodySchema.safeParse(json);
    if (!body.success) return notFound();

    // expire 0: conteúdo corrigido ou bloqueado não pode continuar sendo servido (C5).
    for (const tag of body.data.tags) revalidateTag(tag, { expire: 0 });
    return new Response(null, { status: 204 });
}

// C8: tudo que não é POST responde 404, não 405 (desvio consciente de security.md §3).
export const GET = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
export const HEAD = notFound;
