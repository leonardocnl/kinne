import { DEFAULT_FILTERS, parseFilters, type Filters } from "@/domain/filters";
import { MAX_ROUND } from "@/domain/rounds";
import { isStoredOrigin, type Origin, type StoredOrigin } from "@/domain/origin";
import { isStreaming, type Streaming } from "@/domain/streaming";
import { normalizeTaste, recordSignal, type RecordedSignal } from "@/domain/taste-signals";
import { isBrowserId } from "@/domain/usage-events";

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

function remove(area: Area, key: string) {
    try {
        window[area].removeItem(key);
    } catch {
        // sem acesso ao armazenamento, não há o que apagar
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

/**
 * Os sinais de gosto (US009 RNE001): curti, não curti e vou assistir, numa chave só. Só saem do
 * navegador dentro de um pedido de sorteio (US010 RNE002). Lidos como não confiáveis.
 */
export const tasteSignals = {
    read: () => normalizeTaste(read("localStorage", "kinne:taste")),
    record(id: number, signal: RecordedSignal) {
        write("localStorage", "kinne:taste", recordSignal(tasteSignals.read(), id, signal));
    },
};

/**
 * Sair da conta ou apagá-la (US015 RNE004): o navegador não guarda mais gosto, "Já vi" nem
 * streamings, e a pessoa volta a ser visitante do zero. O código do navegador, a marca da equipe e
 * os filtros da sessão ficam (RNE001).
 */
export function clearAccountKeys() {
    remove("localStorage", "kinne:taste");
    remove("localStorage", "kinne:watched");
    remove("localStorage", "kinne:streamings");
}

/**
 * Sair ou apagar a conta (revisão B1): além das chaves da conta, some o que ela deixou na aba, que
 * o próximo visitante do mesmo computador herdaria: os filtros (com o sentimento), a sequência
 * aberta (com o "Já vi" da conta) e os títulos já mostrados.
 */
export function clearAccountTraces() {
    clearAccountKeys();
    remove("sessionStorage", "kinne:filters");
    remove("sessionStorage", "kinne:filtered-run");
    remove("sessionStorage", "kinne:shown");
}

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

export function saveFilters({ streamings, ...rest }: Filters, persistStreamings = true) {
    // com a conta aberta os streamings são da conta, e o navegador não guarda nenhum (US015 RNE004)
    if (persistStreamings) write("localStorage", "kinne:streamings", streamings);
    write("sessionStorage", "kinne:filters", rest);
}

type FilteredRun = { filters: Filters; watched: number[]; seen: number[]; round: number };

const isRound = (value: unknown): value is number =>
    Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= MAX_ROUND;

/**
 * A sequência aberta por "Sortear um título" (US004 C2 e C3): os filtros e os marcados de quando
 * ela começou, para as rodadas não mudarem (US005 RNE001), os títulos já mostrados e a rodada de
 * 10 em que se sorteia (fase 4). Sem sequência salva (outra aba, endereço copiado) ou com algo fora
 * do formato, vale uma nova com os filtros atuais (recommendation-rounds A5).
 */
export const filteredRun = {
    read(): FilteredRun {
        const value = read("sessionStorage", "kinne:filtered-run");
        const run = typeof value === "object" && value !== null ? (value as FilteredRun) : null;
        const filters = run && parseFilters(run.filters);
        if (!run || !filters || !isRound(run.round))
            return { filters: savedFilters(), watched: watchedTitles.read(), seen: [], round: 0 };
        return { filters, watched: ids(run.watched), seen: ids(run.seen), round: run.round };
    },
    start(filters: Filters, watched: number[]) {
        write("sessionStorage", "kinne:filtered-run", { filters, watched, seen: [], round: 0 });
    },
    see(id: number) {
        const run = filteredRun.read();
        if (!run.seen.includes(id)) run.seen.push(id);
        write("sessionStorage", "kinne:filtered-run", run);
    },
    /** "Sortear entre os próximos 10" (C3): a rodada seguinte, sem repetir os já mostrados */
    advance() {
        const run = filteredRun.read();
        write("sessionStorage", "kinne:filtered-run", {
            ...run,
            round: Math.min(run.round + 1, MAX_ROUND),
        });
    },
    /** "Recomeçar" (C3): a primeira rodada de novo, do começo */
    restart() {
        write("sessionStorage", "kinne:filtered-run", {
            ...filteredRun.read(),
            seen: [],
            round: 0,
        });
    },
};

// Sem onde guardar, o código vale até a página recarregar, em vez de mudar a cada evento.
let currentBrowserId: string | null = null;

/** Código aleatório do navegador para a medição (RNG005, RNF09); criado no primeiro evento. */
export function browserId(): string {
    const stored = read("localStorage", "kinne:browser-id");
    if (isBrowserId(stored)) return stored;
    currentBrowserId ??= crypto.randomUUID();
    write("localStorage", "kinne:browser-id", currentBrowserId);
    return currentBrowserId;
}

/** Navegador da equipe (US006): a marca fica até limparem os dados do navegador (C3). */
export const teamBrowser = {
    is: () => read("localStorage", "kinne:team") === true,
    mark: () => write("localStorage", "kinne:team", true),
};

/**
 * A origem do título (US004 RNE001) fica na aba, não na URL (security §8): gravada antes de
 * navegar e lida na tela do título. Vale só para o título com que foi gravada; qualquer outra
 * coisa (outro título, valor mexido à mão, armazenamento bloqueado) é "link".
 */
export const titleOrigin = {
    set: (slug: string, origin: StoredOrigin) =>
        write("sessionStorage", "kinne:origin", { slug, origin }),
    read(slug: string): Origin {
        const value = read("sessionStorage", "kinne:origin");
        if (typeof value !== "object" || value === null) return "link";
        const { slug: saved, origin } = value as Record<string, unknown>;
        return saved === slug && isStoredOrigin(origin) ? origin : "link";
    },
};

/** "Mudar filtros" (US004 C3) pede à tela inicial que abra o painel ao chegar. Vale uma vez. */
export const filtersOnArrival = {
    request: () => write("sessionStorage", "kinne:open-filters", true),
    take(): boolean {
        const requested = read("sessionStorage", "kinne:open-filters") === true;
        remove("sessionStorage", "kinne:open-filters");
        return requested;
    },
};
