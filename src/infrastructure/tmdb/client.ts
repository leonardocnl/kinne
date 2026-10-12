import "server-only";
const BASE_URL = "https://api.themoviedb.org/3";
const MAX_CONCURRENT = 8; // B5
const MAX_ATTEMPTS = 6;
const TIMEOUT_MS = 15_000; // B7
const MAX_BODY_BYTES = 5 * 1024 * 1024; // B7
const MAX_BACKOFF_MS = 30_000;

// Erro com status e caminho só (D1): nunca a query, os cabeçalhos ou o corpo.
export class TmdbHttpError extends Error {
    constructor(
        readonly status: number,
        path: string,
    ) {
        super(`TMDB respondeu ${status} em ${path}`);
    }
}

// Mensagem de erro que pode ir para o log do Actions (D1): só a do TMDB, que traz status e
// caminho. Qualquer outra (banco, rede, zod) pode carregar host, URL ou valores.
export const publicErrorMessage = (e: unknown): string =>
    e instanceof TmdbHttpError ? e.message : "Erro na carga (detalhe omitido por segurança)";

export class TmdbClient {
    requestCount = 0;
    private active = 0;
    private queue: (() => void)[] = [];

    constructor(
        private readonly token = process.env.TMDB_TOKEN,
        private readonly fetchFn: typeof fetch = fetch,
        private readonly sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
    ) {
        if (!token) throw new Error("TMDB_TOKEN não definido");
    }

    async get(path: string, params: Record<string, string | number> = {}): Promise<unknown> {
        const url = new URL(BASE_URL + path);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

        await this.acquire();
        try {
            for (let attempt = 1; ; attempt++) {
                this.requestCount++;
                let res: Response;
                try {
                    res = await this.fetchFn(url, {
                        headers: {
                            Authorization: `Bearer ${this.token}`,
                            accept: "application/json",
                        },
                        signal: AbortSignal.timeout(TIMEOUT_MS),
                        redirect: "error",
                    });
                    if (res.ok) return JSON.parse(await readCapped(res, path));
                } catch (e) {
                    // timeout, rede ou corpo grande demais: tenta de novo até o limite
                    if (attempt >= MAX_ATTEMPTS) throw e;
                    await this.sleep(backoff(attempt));
                    continue;
                }
                const retryable = res.status === 429 || res.status >= 500;
                if (!retryable || attempt >= MAX_ATTEMPTS) {
                    throw new TmdbHttpError(res.status, path);
                }
                await res.body?.cancel();
                const retryAfter = Number(res.headers.get("retry-after"));
                await this.sleep(
                    retryAfter > 0 ? Math.min(retryAfter * 1000, MAX_BACKOFF_MS) : backoff(attempt),
                );
            }
        } finally {
            this.release();
        }
    }

    private async acquire() {
        if (this.active < MAX_CONCURRENT) {
            this.active++;
            return;
        }
        // O slot é repassado direto por release(), sem decrementar.
        await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    private release() {
        const next = this.queue.shift();
        if (next) next();
        else this.active--;
    }
}

// Exponencial com jitter completo: 0..min(30 s, 0,5 s × 2^tentativa).
const backoff = (attempt: number) => Math.random() * Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt);

export async function readCapped(res: Response, path: string): Promise<string> {
    if (Number(res.headers.get("content-length")) > MAX_BODY_BYTES) {
        await res.body?.cancel();
        throw new Error(`Resposta grande demais em ${path}`);
    }
    const reader = res.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
            await reader.cancel();
            throw new Error(`Resposta grande demais em ${path}`);
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
}
