import "server-only";
import { headers } from "next/headers";
import { clientKey, getClientIp, ipBucket } from "@/infrastructure/client-ip";
import { MemoryLimiter } from "@/infrastructure/memory-limiter";
import { searchConfig } from "@/infrastructure/search-config";

// person-search B1, B4, B5: um limite por visitante para tudo o que consulta pessoas no banco
// (sugestões, títulos da pessoa e o sorteio com pessoa), do tamanho de uma sala de aula.
const limiter = new MemoryLimiter(
    () => searchConfig().catalogPerMinute,
    () => searchConfig().catalogPerMinute / 60,
);

/** Tira uma ficha do visitante; false quando o limite acabou. Sempre antes do banco. */
export async function admitPersonQuery(): Promise<boolean> {
    const ip = getClientIp(await headers());
    const key = clientKey(ip, searchConfig().secret, new Date());
    return limiter.take(key ?? ipBucket(ip));
}
