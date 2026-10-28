// Direção e elenco na tela do título: só texto, a partir dos créditos guardados pela carga.

// Quantos do elenco a carga guarda e o vidro do elenco mostra (US007 C2, US004 C12).
export const CAST_STORED = 28;

// Teto de diretores lidos por título (title-credits D1): hoje o maior tem 15.
export const MAX_DIRECTORS = 20;

/** "X", "X e Y", "X, Y e Z": nomes vazios e repetidos ficam de fora; sem nomes, null. */
export function joinNames(names: readonly string[]): string | null {
    const list = [...new Set(names.map((n) => n.trim()).filter((n) => n.length > 0))];
    if (list.length === 0) return null;
    if (list.length === 1) return list[0];
    return `${list.slice(0, -1).join(", ")} e ${list.at(-1)}`;
}
