import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { REVALIDATE_SECRET_HEADER, revalidateBodySchema } from "@/infrastructure/revalidation";

// Invalidação do cache do catálogo, chamada pela carga no fim de cada execução (C4). Superfície
// pública (C8): só POST, segredo no cabeçalho comparado em tempo constante, corpo estrito e o
// mesmo 404 vazio para qualquer falha (segredo errado, corpo ruim, excesso, outro método).

const MAX_BODY_BYTES = 16 * 1024;
const WINDOW_MS = 60_000;
const MAX_FAILURES_PER_WINDOW = 30;
// ponytail: contador de falhas autenticadas por instância, em memória; mover para um token bucket no Postgres
// (security §7) quando houver limite de taxa de verdade. O segredo de 32 bytes já torna força
// bruta inviável, e quem tem o segredo (a carga) nunca é barrado pelo contador.
let windowStart = 0;
let failures = 0;

const notFound = () => new Response(null, { status: 404 });
const fail = () => {
    failures++;
    return notFound();
};

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
        failures = 0;
    }
    // O segredo vem antes do limite e segredo errado não conta: senão um flood anônimo esgotaria
    // o contador e a carga ficaria sem invalidar (C5). Mesmo 404, sem custo de corpo.
    if (!sameSecret(request.headers.get(REVALIDATE_SECRET_HEADER))) return notFound();
    // Só falhas de quem tem o segredo contam: corpo ruim em excesso recusa sem ler o corpo.
    if (failures > MAX_FAILURES_PER_WINDOW) return fail();
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return fail();
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail();
    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch {
        return fail();
    }
    const body = revalidateBodySchema.safeParse(json);
    if (!body.success) return fail();

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
