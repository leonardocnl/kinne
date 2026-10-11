import { parseFilters, type Filters } from "@/domain/filters";
import { idList } from "./surprise";

/** O pedido de sorteio vem do navegador: só passa no formato e no tamanho esperados. */
export function parseFilterRequest(input: unknown): { filters: Filters; watched: number[] } {
    if (typeof input !== "object" || input === null) throw new Error("Pedido inválido");
    const { filters, watched } = input as Record<string, unknown>;
    const parsed = parseFilters(filters);
    if (!parsed || !idList(watched)) throw new Error("Pedido inválido");
    return { filters: parsed, watched };
}
