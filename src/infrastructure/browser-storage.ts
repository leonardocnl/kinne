import { DEFAULT_FILTERS, parseFilters, type Filters } from "@/domain/filters";
import { isStreaming, type Streaming } from "@/domain/streaming";

// Memória do navegador (RNG005). Navegação privada, cota cheia ou armazenamento bloqueado fazem
// o acesso falhar ou lançar exceção; aí a leitura vale vazio e a escrita é perdida, sem quebrar a
// tela. O conteúdo também pode ter sido mexido à mão: só passa o que tem o formato esperado.
type Area = "localStorage" | "sessionStorage";

function read(area: Area, key: string): unknown {
    try {
        return JSON.parse(window[area].getItem(key) ?? "null");
    } catch {
        return null;
    }
}

function write(area: Area, key: string, value: unknown) {
    try {
        window[area].setItem(key, JSON.stringify(value));
    } catch {
        // sem onde guardar, a marcação vale só até a próxima tela
    }
}

const ids = (value: unknown): number[] =>
    Array.isArray(value) ? value.filter((v) => Number.isSafeInteger(v) && v > 0) : [];

function idList(area: Area, key: string) {
    return {
        read: () => ids(read(area, key)),
        add(id: number) {
            const current = ids(read(area, key));
            if (!current.includes(id)) write(area, key, [...current, id]);
        },
    };
}

/** Títulos marcados como "Já vi": ficam entre visitas (RNG004). */
export const watchedTitles = idList("localStorage", "kinne:watched");

/** Títulos mostrados nesta aba, para a surpresa não repetir (US003 C3). */
export const shownTitles = idList("sessionStorage", "kinne:shown");

/** Streamings salvos pelos filtros (US002); nenhum salvo vale como todos (RNG003). */
export function savedStreamings(): Streaming[] {
    const value = read("localStorage", "kinne:streamings");
    return Array.isArray(value)
        ? value.filter((s): s is Streaming => typeof s === "string" && isStreaming(s))
        : [];
}

/**
 * Os filtros da última escolha (US002): os streamings voltam em outra visita (C7); o resto vale
 * só enquanto a aba está aberta (RNG005). O que não tem o formato esperado volta ao padrão.
 */
export function savedFilters(): Filters {
    const streamings = savedStreamings();
    const rest = read("sessionStorage", "kinne:filters");
    const saved = typeof rest === "object" && rest !== null ? rest : {};
    return parseFilters({ ...saved, streamings }) ?? { ...DEFAULT_FILTERS, streamings };
}

export function saveFilters({ streamings, ...rest }: Filters) {
    write("localStorage", "kinne:streamings", streamings);
    write("sessionStorage", "kinne:filters", rest);
}
