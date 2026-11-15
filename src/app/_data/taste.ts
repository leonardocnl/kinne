import { z } from "zod";
import {
    MAX_TITLE_ID,
    normalizeTaste,
    SURPRISE_MAX_EXCLUDED,
    TASTE_LIST_MAX,
} from "@/domain/taste-signals";

// Os sinais de gosto como chegam do navegador (US009 RNE001). Tudo é id de título: nenhum número
// de ajuste (pesos, passos, piso) vem do cliente (feelings-and-taste-ui A6).
const idList = z.array(z.int().positive().max(MAX_TITLE_ID)).max(TASTE_LIST_MAX);

export const idListSchema = z
    .array(z.int().positive().max(MAX_TITLE_ID))
    .max(SURPRISE_MAX_EXCLUDED);

/**
 * Estrito (chave desconhecida recusada), até 200 ids positivos por lista. Repetidos colapsam e um
 * id em duas listas fica na mais negativa (A3). Ids que não estão no grafo são ignorados lá.
 */
export const tasteSchema = z
    .strictObject({ liked: idList, willWatch: idList, disliked: idList })
    .transform(normalizeTaste);
