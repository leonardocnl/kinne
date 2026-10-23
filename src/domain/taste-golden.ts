import type { Feeling } from "./feelings";
import type { TasteSignal } from "./taste-graph";

// Gabarito do grafo de gosto (docs/design/taste-graph.md §10). Para cada sentimento e para
// perfis de gosto de exemplo: títulos que precisam estar entre os 30 primeiros e títulos que não
// podem aparecer em lugar nenhum entre os 30. Uma mudança de peso só entra se aumentar os
// encontrados sem criar violação.
//
// Títulos pelo nome em pt-BR e o ano, como o catálogo mostra. Um título que o catálogo não tem
// (saiu do streaming, nome diferente) aparece como "ausente" e não conta para nada: corrija o
// nome ou tire a linha.

export const GOLDEN_TOP = 30;

export type TitleRef = { name: string; year: number };

export type GoldenCase = { expected: readonly TitleRef[]; forbidden: readonly TitleRef[] };

const t = (name: string, year: number): TitleRef => ({ name, year });

export const FEELING_GOLDEN: Record<Feeling, GoldenCase> = {
    laugh: {
        expected: [
            t("Os Simpsons", 1989),
            t("Futurama", 1999),
            t("BoJack Horseman", 2014),
            t("Community", 2009),
            t("Chapolin Colorado", 1973),
            t("Gente Grande", 2010),
        ],
        forbidden: [
            t("One-Punch Man", 2015),
            t("Gavião Arqueiro", 2021),
            t("MASHLE: MAGIA E MÚSCULOS", 2023),
            t("Invocação do Mal", 2013),
        ],
    },
    cry: {
        expected: [
            t("O Rei Leão", 1994),
            t("This Is Us", 2016),
            t("Titanic", 1997),
            t("Um Amor para Recordar", 2002),
            t("À Procura da Felicidade", 2006),
            t("Ainda Estou Aqui", 2024),
            t("Por Lugares Incríveis", 2020),
        ],
        forbidden: [
            t("Breaking Bad", 2008),
            t("Neon Genesis Evangelion", 1995),
            t("WandaVision", 2021),
            t("Donnie Darko", 2001),
            t("O Sexto Sentido", 1999),
        ],
    },
    "nail-biting": {
        expected: [
            t("O Fugitivo", 1993),
            t("Seven - Os Sete Crimes Capitais", 1995),
            t("Animais Noturnos", 2016),
            t("O Plano Perfeito", 2006),
            t("Corra, Lola, Corra", 1998),
        ],
        forbidden: [t("O Show de Tom e Jerry", 2014), t("Os Smurfs", 2011)],
    },
    scare: {
        expected: [
            t("Invocação do Mal", 2013),
            t("O Exorcista", 1973),
            t("Hereditário", 2018),
            t("O Orfanato", 2007),
            t("It: A Coisa", 2017),
            t("A Hora do Pesadelo", 1984),
            t("Pânico", 1996),
        ],
        forbidden: [
            t("Os Fantasmas se Divertem", 1988),
            t("Cachorrinhos do Outro Mundo", 2022),
            t("Fantasma e CIA", 2023),
        ],
    },
    cozy: {
        expected: [
            t('Anne com um "E"', 2017),
            t("Klaus", 2019),
            t("Gravity Falls: Um Verão de Mistérios", 2012),
            t("Bluey", 2018),
            t("Steven Universo", 2013),
        ],
        forbidden: [
            t("Mr. Pickles", 2014),
            t("Sex Education", 2019),
            t("POSE", 2018),
            t("The Old Guard 2", 2025),
        ],
    },
    "mind-bending": {
        expected: [
            t("Dark", 2017),
            t("Black Mirror", 2011),
            t("Interestelar", 2014),
            t("Donnie Darko", 2001),
            t("True Detective", 2014),
        ],
        forbidden: [
            t("Vingadores: Ultimato", 2019),
            t("Outlander", 2014),
            t("Manchester à Beira-Mar", 2016),
            t("O Irlandês", 2019),
        ],
    },
    explosions: {
        expected: [
            t("Duro de Matar", 1988),
            t("Missão: Impossível - Efeito Fallout", 2018),
            t("A Identidade Bourne", 2002),
            t("Furiosa: Uma Saga Mad Max", 2024),
            t("John Wick: Um Novo Dia para Matar", 2017),
        ],
        forbidden: [t("Os Smurfs", 2011), t("Toy Story 5", 2026)],
    },
    swoon: {
        expected: [
            t("As Pontes de Madison", 1995),
            t("Para Todos os Garotos que Já Amei", 2018),
            t("(500) Dias com Ela", 2009),
            t("Encontro Marcado", 1998),
            t("Amor à Primeira Vista", 2023),
        ],
        forbidden: [t("Invocação do Mal", 2013), t("Duro de Matar", 1988)],
    },
    "true-story": {
        expected: [
            t("Chernobyl", 2019),
            t("O Jogo da Imitação", 2014),
            t("Olhos que Condenam", 2019),
            t("Ford vs Ferrari", 2019),
            t("Os Bons Companheiros", 1990),
            t("Bohemian Rhapsody", 2018),
            t("Lion: Uma Jornada para Casa", 2016),
        ],
        forbidden: [
            t("Grandes Fracassos: Woodstock 99", 2022),
            t("Pompeia: Revelações Inéditas", 2019),
        ],
    },
};

export type TasteGoldenCase = GoldenCase & {
    label: string;
    signals: readonly { title: TitleRef; signal: TasteSignal }[];
};

export const TASTE_GOLDEN: readonly TasteGoldenCase[] = [
    {
        label: "curtiu Chernobyl",
        signals: [{ title: t("Chernobyl", 2019), signal: "liked" }],
        expected: [t("Olhos que Condenam", 2019), t("Fukushima: Ameaça Nuclear", 2020)],
        forbidden: [t("Bluey", 2018), t("Os Simpsons", 1989), t("Klaus", 2019)],
    },
    {
        label: "curtiu Breaking Bad",
        signals: [{ title: t("Breaking Bad", 2008), signal: "liked" }],
        expected: [t("Better Call Saul", 2015)],
        forbidden: [t("Bluey", 2018), t("Para Todos os Garotos que Já Amei", 2018)],
    },
    {
        label: "curtiu Invocação do Mal, não curtiu Pânico",
        signals: [
            { title: t("Invocação do Mal", 2013), signal: "liked" },
            { title: t("Pânico", 1996), signal: "disliked" },
        ],
        expected: [
            t("Invocação do Mal 4: O Último Ritual", 2025),
            t("Sobrenatural: Capítulo 2", 2013),
        ],
        forbidden: [t("Klaus", 2019), t("Amor à Primeira Vista", 2023)],
    },
    {
        label: "curtiu Seven",
        signals: [{ title: t("Seven - Os Sete Crimes Capitais", 1995), signal: "liked" }],
        expected: [t("Zodíaco", 2007), t("Garota Exemplar", 2014)],
        forbidden: [t("Bluey", 2018), t("Os Smurfs", 2011)],
    },
];

export type GoldenResult = {
    found: number;
    expected: number;
    // nomes dos títulos esperados que ficaram fora dos 30
    missed: string[];
    // nomes dos proibidos que apareceram
    violations: string[];
    // títulos do gabarito que o catálogo não tem
    absent: string[];
};

const label = (r: TitleRef) => `${r.name} (${r.year})`;

/** Confere uma lista ordenada contra um caso do gabarito. */
export function evaluateGolden(
    ranked: readonly number[],
    golden: GoldenCase,
    resolve: (ref: TitleRef) => number | undefined,
    top = GOLDEN_TOP,
): GoldenResult {
    const head = new Set(ranked.slice(0, top));
    const result: GoldenResult = {
        found: 0,
        expected: 0,
        missed: [],
        violations: [],
        absent: [],
    };
    for (const ref of golden.expected) {
        const id = resolve(ref);
        if (id === undefined) {
            result.absent.push(label(ref));
            continue;
        }
        result.expected++;
        if (head.has(id)) result.found++;
        else result.missed.push(label(ref));
    }
    for (const ref of golden.forbidden) {
        const id = resolve(ref);
        if (id === undefined) result.absent.push(label(ref));
        else if (head.has(id)) result.violations.push(label(ref));
    }
    return result;
}

/** Normaliza um nome para casar com o catálogo: minúsculas, sem acento, espaços simples. */
export function normalizeTitleName(name: string): string {
    return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}
