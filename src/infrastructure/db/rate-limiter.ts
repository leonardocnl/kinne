import "server-only";
import { sql } from "drizzle-orm";
import type { Admission } from "@/application/title-search";
import type { Db } from "./client";

/** Token bucket no Postgres (kinne_take_tokens, migration 0006): [chave, capacidade, fichas/s]. */
export async function takeTokens(
    db: Db,
    buckets: [key: string, capacity: number, perSecond: number][],
    breaker: string | null = null,
): Promise<Admission> {
    const array = (i: 0 | 1 | 2, type: string) =>
        sql`array[${sql.join(
            buckets.map((b) => sql`${b[i]}`),
            sql`, `,
        )}]::${sql.raw(type)}`;
    const result = await db.execute<{ admission: Admission }>(
        sql`select kinne_take_tokens(${array(0, "text[]")}, ${array(1, "float8[]")}, ${array(2, "float8[]")}, ${breaker}::text) as admission`,
    );
    const admission = result.rows[0]?.admission;
    if (admission !== "ok" && admission !== "limited" && admission !== "open") {
        throw new Error("Resposta inesperada do limitador");
    }
    return admission;
}
