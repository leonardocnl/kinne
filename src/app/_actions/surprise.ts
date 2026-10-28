"use server";

import "server-only";
import { LIMITED, type Limited } from "@/domain/rate-limit";
import { drawSurprise } from "@/domain/surprise";
import { spreadTaste } from "@/domain/taste-graph";
import { hasPositiveSignal, toSignals } from "@/domain/taste-signals";
import { drawAccount } from "../_data/account";
import { candidates } from "../_data/candidates";
import { admitDraw } from "../_data/draw-limit";
import { parseSurpriseRequest } from "../_data/surprise";
import { neighborGraphOrNull } from "../_data/taste-graph";

/**
 * Me surpreenda (US003): sorteia no servidor e devolve o slug do título, ou null se não sobrou
 * nenhum. Recebe o que o navegador guarda: streamings salvos, marcados, já mostrados e sinais de gosto.
 * Passado o limite do visitante (security.md §7), devolve LIMITED antes de qualquer consulta.
 */
export async function surprise(input: unknown): Promise<string | null | Limited> {
    const parsed = parseSurpriseRequest(input);
    if (!(await admitDraw())) return LIMITED;
    // com a conta aberta, tudo vem da conta e as listas do pedido não valem (US015 RNE003)
    const account = await drawAccount();
    const taste = account ? account.taste : parsed.taste;
    const request = {
        streamings: account ? account.streamings : parsed.streamings,
        watched: account ? account.watched : parsed.watched,
        shown: parsed.shown,
    };
    // com sinal positivo, o sorteio puxa para o gosto (US009 C3); sem grafo, é o de sempre
    const graph = hasPositiveSignal(taste) ? await neighborGraphOrNull() : null;
    const scores = graph ? spreadTaste(graph, toSignals(taste)) : null;
    return drawSurprise(await candidates(), request, Math.random, scores)?.slug ?? null;
}
