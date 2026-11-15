// Limite por instância, em memória, para o caminho barato da busca (B3, decisão do threat model).
// ponytail: cada instância conta sozinha; um robô distribuído ganha mais que o nominal. O cache e o
// tempo limite da consulta seguram o custo; Postgres se isso deixar de bastar.
const MAX_KEYS = 10_000;

export class MemoryLimiter {
    private buckets = new Map<string, { tokens: number; at: number }>();

    constructor(
        private readonly capacity: () => number,
        private readonly perSecond: () => number,
        private readonly now = Date.now,
    ) {}

    take(key: string): boolean {
        const now = this.now();
        const capacity = this.capacity();
        const last = this.buckets.get(key);
        const tokens = last
            ? Math.min(capacity, last.tokens + ((now - last.at) / 1000) * this.perSecond())
            : capacity;
        if (tokens < 1) return false;
        // reinsere no fim: o Map fica em ordem de uso e o mais antigo sai primeiro
        this.buckets.delete(key);
        this.buckets.set(key, { tokens: tokens - 1, at: now });
        if (this.buckets.size > MAX_KEYS) this.buckets.delete(this.buckets.keys().next().value!);
        return true;
    }
}
