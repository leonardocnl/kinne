import { doublePrecision, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Configuração por banco. A linha 'environment' é gravada à mão em cada branch do Neon (C3).
export const meta = pgTable("meta", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

// Token bucket (busca B1, G15). A chave do visitante é um HMAC do IP com sal diário (E2, G16).
export const rateLimitBuckets = pgTable(
    "rate_limit_buckets",
    {
        key: text("key").primaryKey(),
        tokens: doublePrecision("tokens").notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    },
    (t) => [index("rate_limit_buckets_updated_at_idx").on(t.updatedAt)],
);
