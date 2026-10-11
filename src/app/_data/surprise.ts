import { SURPRISE_MAX_EXCLUDED, type SurpriseRequest } from "@/domain/surprise";
import { isStreaming, STREAMING_SERVICES } from "@/domain/streaming";

export const idList = (value: unknown): value is number[] =>
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
