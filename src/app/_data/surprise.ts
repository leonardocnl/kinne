import { cacheLife } from "next/cache";
import {
    SURPRISE_MAX_EXCLUDED,
    type SurpriseCandidate,
    type SurpriseRequest,
} from "@/domain/surprise";
import { isStreaming, STREAMING_SERVICES } from "@/domain/streaming";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleTitlesRepository } from "@/infrastructure/db/titles-repository";

/**
 * Os títulos sorteáveis, em cache por um dia (o catálogo muda uma vez por dia). O sorteio em si
 * não tem cache: cada pedido sorteia de novo sobre esta lista.
 */
export async function surpriseCandidates(): Promise<SurpriseCandidate[]> {
    "use cache: remote";
    cacheLife("days");
    return new DrizzleTitlesRepository(createDb()).surpriseCandidates();
}

const idList = (value: unknown): value is number[] =>
    Array.isArray(value) &&
    value.length <= SURPRISE_MAX_EXCLUDED &&
    value.every((v) => Number.isSafeInteger(v) && v > 0);

/** O pedido vem do navegador: só passa no formato e no tamanho esperados. */
export function parseSurpriseRequest(input: unknown): SurpriseRequest {
    if (typeof input !== "object" || input === null) throw new Error("Pedido inválido");
    const { streamings, watched, shown } = input as Record<string, unknown>;
    if (
        !Array.isArray(streamings) ||
        streamings.length > STREAMING_SERVICES.length ||
        !streamings.every((s) => typeof s === "string" && isStreaming(s)) ||
        !idList(watched) ||
        !idList(shown)
    ) {
        throw new Error("Pedido inválido");
    }
    return { streamings, watched, shown };
}
