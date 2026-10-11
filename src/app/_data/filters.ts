import { parseFilters, type Filters } from "@/domain/filters";
import { idList } from "./surprise";

export type FilterRequest = {
    filters: Filters;
    // marcados quando os filtros abriram: o marcado depois conta como uma das 10 (US005 RNE001)
    watched: number[];
    // já mostrados desde "Ver recomendação", para "Outra opção" não repetir (US004 C2)
    seen: number[];
};

/** O pedido de sorteio vem do navegador: só passa no formato e no tamanho esperados. */
export function parseFilterRequest(input: unknown): FilterRequest {
    if (typeof input !== "object" || input === null) throw new Error("Pedido inválido");
    const { filters, watched, seen } = input as Record<string, unknown>;
    const parsed = parseFilters(filters);
    if (!parsed || !idList(watched) || !idList(seen)) throw new Error("Pedido inválido");
    return { filters: parsed, watched, seen };
}
