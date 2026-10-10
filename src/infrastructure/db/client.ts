import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// App e scripts usam a conexão pelo pooler; a direta é só para migrations.
export function createDb(url = process.env.DATABASE_URL_POOLED) {
    if (!url) throw new Error("DATABASE_URL_POOLED não definida");
    return drizzle(url, { schema });
}

export type Db = ReturnType<typeof createDb>;
