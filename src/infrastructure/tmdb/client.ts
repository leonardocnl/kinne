const BASE_URL = "https://api.themoviedb.org/3";
const MAX_CONCURRENT = 8;
const MAX_ATTEMPTS = 6;

export class TmdbClient {
    requestCount = 0;
    private active = 0;
    private queue: (() => void)[] = [];

    constructor(private readonly token = process.env.TMDB_TOKEN) {
        if (!token) throw new Error("TMDB_TOKEN não definido");
    }

    async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
        const url = new URL(BASE_URL + path);
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

        await this.acquire();
        try {
            for (let attempt = 1; ; attempt++) {
                this.requestCount++;
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${this.token}`, accept: "application/json" },
                });
                if (res.status === 429 && attempt < MAX_ATTEMPTS) {
                    const retryAfter = Number(res.headers.get("retry-after"));
                    await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000 * attempt);
                    continue;
                }
                if (!res.ok) throw new Error(`TMDB respondeu ${res.status} em ${path}`);
                return (await res.json()) as T;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
