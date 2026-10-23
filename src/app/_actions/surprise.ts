"use server";

import "server-only";
import { drawSurprise } from "@/domain/surprise";
import { spreadTaste } from "@/domain/taste-graph";
import { hasPositiveSignal, toSignals } from "@/domain/taste-signals";
import { candidates } from "../_data/candidates";
import { parseSurpriseRequest } from "../_data/surprise";
import { neighborGraphOrNull } from "../_data/taste-graph";

/**
 * Me surpreenda (US003): sorteia no servidor e devolve o slug do título, ou null se não sobrou
 * nenhum. Recebe o que o navegador guarda: streamings salvos, marcados, já mostrados e sinais de gosto.
 */
export async function surprise(input: unknown): Promise<string | null> {
    const { taste, ...request } = parseSurpriseRequest(input);
    // com sinal positivo, o sorteio puxa para o gosto (US009 C3); sem grafo, é o de sempre
    const graph = hasPositiveSignal(taste) ? await neighborGraphOrNull() : null;
    const scores = graph ? spreadTaste(graph, toSignals(taste)) : null;
    return drawSurprise(await candidates(), request, Math.random, scores)?.slug ?? null;
}
