import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { createDb } from "@/infrastructure/db/client";
import { takeTokens } from "@/infrastructure/db/rate-limiter";
import { REVALIDATE_SECRET_HEADER, revalidateBodySchema } from "@/infrastructure/revalidation";

// Invalidação do cache do catálogo, chamada pela carga no fim de cada execução (C4). Superfície
// pública (C8): só POST, segredo no cabeçalho comparado em tempo constante, corpo estrito, limite
// de taxa no Postgres (security §7) e o mesmo 404 vazio para qualquer falha (segredo errado, corpo
// ruim, excesso, limitador fora do ar, outro método).

const MAX_BODY_BYTES = 16 * 1024;
// A carga manda no máximo 6 pedidos por execução (tagsFor); 30 por minuto sobra.
const BUCKET: [string, number, number] = ["revalidate", 30, 30 / 60];

const notFound = () => new Response(null, { status: 404 });

function sameSecret(given: string | null): boolean {
    const expected = process.env.REVALIDATE_SECRET;
    if (!expected || !given) return false;
    // Hash dos dois lados: mesmo tamanho, comparação sem vazar o comprimento.
    const digest = (s: string) => createHash("sha256").update(s).digest();
    return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request: Request): Promise<Response> {
    // O segredo vem antes do limite: um flood anônimo não gasta as fichas da carga (C5).
    if (!sameSecret(request.headers.get(REVALIDATE_SECRET_HEADER))) return notFound();
    // Falha fechada: sem resposta do limitador, nada é invalidado.
    const admission = await (async () => takeTokens(createDb(), [BUCKET]))().catch(
        () => "limited" as const,
    );
    if (admission !== "ok") return notFound();
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
