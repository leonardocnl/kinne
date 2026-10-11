"use server";

import { drawSurprise } from "@/domain/surprise";
import { candidates } from "../_data/candidates";
import { parseSurpriseRequest } from "../_data/surprise";

/**
 * Me surpreenda (US003): sorteia no servidor e devolve o slug do título, ou null se não sobrou
 * nenhum. Recebe o que o navegador guarda: streamings salvos, marcados e já mostrados.
 */
export async function surprise(input: unknown): Promise<string | null> {
    const request = parseSurpriseRequest(input);
    return drawSurprise(await candidates(), request)?.slug ?? null;
}
