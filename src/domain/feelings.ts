import { featureKey, type Seed } from "./taste-graph";

// Escolha por sentimento: cada sentimento é uma "receita" de pontos de partida no grafo de gosto.
// Os temas são referidos pelo nome em inglês do TMDB (o banco guarda o nome, e o id do TMDB de um
// tema não é algo que se saiba de cor); a infrastructure resolve nome → tema na hora de montar.
// Os pesos são valores de partida, a calibrar contra o catálogo real.

export const FEELINGS = [
    "laugh",
    "cry",
    "nail-biting",
    "scare",
    "cozy",
    "mind-bending",
    "explosions",
    "swoon",
    "true-story",
] as const;

export type Feeling = (typeof FEELINGS)[number];

export function isFeeling(value: string): value is Feeling {
    return (FEELINGS as readonly string[]).includes(value);
}

export const FEELING_LABELS: Record<Feeling, string> = {
    laugh: "Pra dar risada",
    cry: "Pra chorar",
    "nail-biting": "Pra roer as unhas",
    scare: "Pra tomar susto",
    cozy: "Pra ficar quentinho",
    "mind-bending": "Pra quebrar a cabeça",
    explosions: "Pra ver explosão",
    swoon: "Pra suspirar",
    "true-story": "Baseado em fatos",
};

export type FeelingRecipe = {
    // gêneros do TMDB (ids de filme e de série) com o peso de cada um
    genres: Readonly<Record<number, number>>;
    // temas do TMDB pelo nome, com peso
    keywords: Readonly<Record<string, number>>;
    // o que afasta: vira semente negativa
    avoidGenres?: Readonly<Record<number, number>>;
    avoidKeywords?: Readonly<Record<string, number>>;
};

// Ids de gênero do TMDB usados nas receitas (filme / série).
const G = {
    action: 28,
    adventure: 12,
    actionAdventure: 10759,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    mystery: 9648,
    romance: 10749,
    sciFi: 878,
    sciFiFantasy: 10765,
    thriller: 53,
    war: 10752,
    warPolitics: 10768,
} as const;

export const FEELING_RECIPES: Record<Feeling, FeelingRecipe> = {
    laugh: {
        genres: { [G.comedy]: 3, [G.family]: 0.5, [G.animation]: 0.5 },
        keywords: { "buddy comedy": 2, "road trip": 1, friendship: 1, parody: 1.5, satire: 1 },
        avoidGenres: { [G.horror]: 1, [G.war]: 1 },
        avoidKeywords: { death: 1, grief: 1.5, cancer: 1.5, suicide: 2 },
    },
    cry: {
        genres: { [G.drama]: 2, [G.romance]: 0.5 },
        keywords: {
            grief: 2,
            loss: 1.5,
            "terminal illness": 2,
            "father son relationship": 1,
            "mother daughter relationship": 1,
            "tragic love": 1.5,
            "coming of age": 0.5,
        },
        avoidGenres: { [G.comedy]: 1, [G.horror]: 1 },
    },
    "nail-biting": {
        genres: { [G.thriller]: 3, [G.crime]: 1.5, [G.mystery]: 1 },
        keywords: {
            heist: 1.5,
            "cat and mouse": 2,
            hostage: 1.5,
            "serial killer": 1,
            survival: 1,
            "race against time": 2,
        },
        avoidGenres: { [G.comedy]: 1, [G.family]: 1 },
    },
    scare: {
        genres: { [G.horror]: 3 },
        keywords: { supernatural: 1.5, "haunted house": 2, possession: 1.5, slasher: 1.5 },
        avoidGenres: { [G.comedy]: 0.5, [G.family]: 1.5, [G.animation]: 1 },
    },
    cozy: {
        genres: { [G.family]: 1.5, [G.comedy]: 1, [G.animation]: 1, [G.romance]: 0.5 },
        keywords: {
            "feel-good": 2.5,
            friendship: 1.5,
            "small town": 1,
            "found family": 2,
            heartwarming: 2,
        },
        avoidGenres: { [G.horror]: 2, [G.war]: 1.5, [G.thriller]: 1 },
        avoidKeywords: { murder: 1.5, "serial killer": 2, torture: 2 },
    },
    "mind-bending": {
        genres: { [G.mystery]: 2, [G.sciFi]: 2, [G.sciFiFantasy]: 1.5, [G.thriller]: 0.5 },
        keywords: {
            "time travel": 2,
            "plot twist": 2,
            "alternate reality": 2,
            dystopia: 1,
            "artificial intelligence": 1,
            "nonlinear timeline": 2,
        },
        avoidGenres: { [G.family]: 1 },
    },
    explosions: {
        genres: { [G.action]: 3, [G.adventure]: 1.5, [G.actionAdventure]: 3 },
        keywords: { "car chase": 2, shootout: 1.5, "martial arts": 1.5, superhero: 1, spy: 1 },
        avoidGenres: { [G.romance]: 1, [G.documentary]: 1 },
    },
    swoon: {
        genres: { [G.romance]: 3, [G.comedy]: 0.5, [G.drama]: 0.5 },
        keywords: { "romantic comedy": 2, "love at first sight": 1.5, "first love": 1.5 },
        avoidGenres: { [G.horror]: 2, [G.war]: 1 },
    },
    "true-story": {
        genres: { [G.history]: 1.5, [G.crime]: 1, [G.drama]: 0.5, [G.documentary]: 1 },
        keywords: {
            "based on true story": 3,
            biography: 2,
            "true crime": 2.5,
            "historical event": 1.5,
            disaster: 1,
        },
    },
};

/**
 * As sementes de um sentimento. Recebe a função que resolve o nome de um tema no id do TMDB;
 * temas que o catálogo não tem simplesmente não entram.
 */
export function feelingSeeds(
    feeling: Feeling,
    resolveKeyword: (name: string) => number | undefined,
): { likes: Seed[]; dislikes: Seed[] } {
    const recipe = FEELING_RECIPES[feeling];
    const toSeeds = (
        genres: Readonly<Record<number, number>> = {},
        keywords: Readonly<Record<string, number>> = {},
    ): Seed[] => {
        const seeds: Seed[] = Object.entries(genres).map(([id, weight]) => ({
            feature: featureKey("genre", Number(id)),
            weight,
        }));
        for (const [name, weight] of Object.entries(keywords)) {
            const id = resolveKeyword(name);
            if (id !== undefined) seeds.push({ feature: featureKey("keyword", id), weight });
        }
        return seeds;
    };
    return {
        likes: toSeeds(recipe.genres, recipe.keywords),
        dislikes: toSeeds(recipe.avoidGenres, recipe.avoidKeywords),
    };
}
