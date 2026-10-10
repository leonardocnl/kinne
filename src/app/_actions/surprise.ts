"use server";

import { drawSurprise } from "@/domain/surprise";
import { parseSurpriseRequest, surpriseCandidates } from "../_data/surprise";

/**
 * Me surpreenda (US003): sorteia no servidor e devolve o slug do título, ou null se não sobrou
 * nenhum. Recebe o que o navegador guarda: streamings salvos, marcados e já mostrados.
 */
export async function surprise(input: unknown): Promise<string | null> {
    const request = parseSurpriseRequest(input);
    return drawSurprise(await surpriseCandidates(), request)?.slug ?? null;
}
