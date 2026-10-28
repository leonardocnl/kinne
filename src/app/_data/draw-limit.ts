import "server-only";
import { headers } from "next/headers";
import { clientKey, getClientIp, ipBucket } from "@/infrastructure/client-ip";
import { MemoryLimiter } from "@/infrastructure/memory-limiter";
import { searchConfig } from "@/infrastructure/search-config";

// security.md §7: limite por visitante nos sorteios (surpresa e filtros) e nos eventos, em memória
// por instância, como a busca. ponytail: cada instância conta sozinha; Postgres se não bastar.
// Sorteios: rajada de 30 e uma ficha a cada 2 s (ninguém clica no dado mais que isso).
const draws = new MemoryLimiter(
    () => 30,
    () => 0.5,
);
// Eventos: rajada de 120 e duas fichas por segundo (uma tela manda poucos; um robô, milhares).
const events = new MemoryLimiter(
    () => 120,
    () => 2,
);

async function visitor() {
    const ip = getClientIp(await headers());
    return clientKey(ip, searchConfig().secret, new Date()) ?? ipBucket(ip);
}

/** Tira uma ficha de sorteio do visitante; false quando acabou. Sempre antes do banco. */
export async function admitDraw(): Promise<boolean> {
    return draws.take(await visitor());
}

/** Tira uma ficha de evento do visitante; false quando acabou. */
export async function admitEvent(): Promise<boolean> {
    return events.take(await visitor());
}
