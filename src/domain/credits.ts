// Direção e elenco na tela do título: só texto, a partir dos créditos guardados pela carga.

// Quantos do elenco aparecem, na ordem dos créditos do TMDB.
export const CAST_SHOWN = 3;

// Teto de diretores lidos por título (title-credits D1): hoje o maior tem 15.
export const MAX_DIRECTORS = 20;

/** "X", "X e Y", "X, Y e Z": nomes vazios e repetidos ficam de fora; sem nomes, null. */
export function joinNames(names: readonly string[]): string | null {
    const list = [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 0))];
    if (list.length === 0) return null;
    if (list.length === 1) return list[0];
    return `${list.slice(0, -1).join(", ")} e ${list.at(-1)}`;
}

/** "Direção de X" com todos os diretores; sem nenhum, a linha não aparece. */
export function directionLine(directors: readonly string[]): string | null {
    const names = joinNames(directors);
    return names && `Direção de ${names}`;
}

/** "Com A, B e C": os três primeiros do elenco, na ordem; sem elenco, a linha não aparece. */
export function castLine(cast: readonly string[]): string | null {
    const names = joinNames(cast.slice(0, CAST_SHOWN));
    return names && `Com ${names}`;
}
