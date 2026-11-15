// Memória do navegador (RNG005). Navegação privada, cota cheia ou armazenamento bloqueado fazem
// o acesso falhar ou lançar exceção; aí a leitura vale vazio e a escrita é perdida, sem quebrar a
// tela. O conteúdo também pode ter sido mexido à mão: só passa o que tem o formato esperado.
export type Area = "localStorage" | "sessionStorage";

export function read(area: Area, key: string): unknown {
    try {
        return JSON.parse(window[area].getItem(key) ?? "null");
    } catch {
        return null;
    }
}

export function remove(area: Area, key: string) {
    try {
        window[area].removeItem(key);
    } catch {
        // sem acesso ao armazenamento, não há o que apagar
    }
}

export function write(area: Area, key: string, value: unknown) {
    try {
        window[area].setItem(key, JSON.stringify(value));
    } catch {
        // sem onde guardar, a marcação vale só até a próxima tela
    }
}

export const ids = (value: unknown): number[] =>
    Array.isArray(value) ? value.filter((v) => Number.isSafeInteger(v) && v > 0) : [];

export function idList(area: Area, key: string) {
    return {
        read: () => ids(read(area, key)),
        add(id: number) {
            const current = ids(read(area, key));
            if (!current.includes(id)) write(area, key, [...current, id]);
        },
    };
}
