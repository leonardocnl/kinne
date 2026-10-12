// Casos da normalização da busca (G14), conferidos em dois lugares: search.test.ts (TypeScript) e
// scripts/check-search-normalization.ts (kinne_normalize no banco).
export const NORMALIZATION_CASES: [input: string, normalized: string][] = [
    ["Ação", "acao"],
    ["CORAÇÃO", "coracao"],
    ["Amélie", "amelie"],
    ["Pokémon", "pokemon"],
    ["Über", "uber"],
    ["Straße", "strasse"],
    ["Ænima", "aenima"],
    ["Œuvre", "oeuvre"],
    ["Ørsted", "orsted"],
    ["Łódź", "lodz"],
    ["Ñandú", "nandu"],
    ["São Paulo", "sao paulo"],
    ["100%", "100%"],
    ["a_b", "a_b"],
];
