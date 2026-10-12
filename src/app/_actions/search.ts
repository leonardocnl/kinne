"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { searchTitles as search } from "@/application/title-search";
import { MAX_RAW_TERM_LENGTH, parseSearchTerm, type SearchOutcome } from "@/domain/search";
import { clientKey, getClientIp, ipBucket } from "@/infrastructure/client-ip";
import { MemoryLimiter } from "@/infrastructure/memory-limiter";
import { searchConfig } from "@/infrastructure/search-config";
import { TmdbHttpError } from "@/infrastructure/tmdb/client";
import { countSearch, flushSearchCounters, searchPorts } from "../_data/search";

const DEADLINE_MS = 5_000; // G13
const UNAVAILABLE = { kind: "unavailable" } as const;

// H4: o tamanho bruto é conferido antes de qualquer normalização.
const inputSchema = z.strictObject({ term: z.string().max(MAX_RAW_TERM_LENGTH) });

const catalogLimiter = new MemoryLimiter(
    () => searchConfig().catalogPerMinute,
    () => searchConfig().catalogPerMinute / 60,
);

/**
 * A única ação da busca (G8). O termo chega só no corpo do POST (H3) e nunca vai para o log nem
 * para o banco (C2): o cache do TMDB guarda o hash dele.
 */
export async function searchTitles(input: unknown): Promise<SearchOutcome> {
    const parsed = inputSchema.safeParse(input);
    const term = parsed.success ? parseSearchTerm(parsed.data.term) : null;
    if (!term) return { kind: "none" };

    after(() =>
        flushSearchCounters().catch(() => console.error("Contadores da busca não gravados")),
    );
    const config = searchConfig();
    const ip = getClientIp(await headers());
    const key = clientKey(ip, config.secret, new Date());
    // B7: recusa antes de qualquer consulta
    if (!catalogLimiter.take(key ?? ipBucket(ip))) {
        countSearch("rate_limited");
        return UNAVAILABLE;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<SearchOutcome>((resolve) => {
        timer = setTimeout(() => resolve(UNAVAILABLE), DEADLINE_MS);
    });
    try {
        const termHash = createHash("sha256").update(term).digest("hex");
        const request = { term, termHash, clientKey: key, fallback: config.fallback };
        return await Promise.race([search(request, searchPorts(config)), deadline]);
    } catch (error) {
        // C5: só status e caminho do TMDB; o resto pode trazer host ou o próprio termo
        console.error(
            "Busca falhou:",
            error instanceof TmdbHttpError ? error.message : "detalhe omitido",
        );
        return UNAVAILABLE;
    } finally {
        clearTimeout(timer);
    }
}
