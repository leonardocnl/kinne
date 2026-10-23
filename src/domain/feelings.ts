import { featureKey, toPercentiles, type Seed } from "./taste-graph";

// Escolha por sentimento: cada sentimento é uma "receita" de pontos de partida no grafo de gosto,
// mais duas regras duras de gênero (o que o título precisa ter e o que ele não pode ter).
// Os temas são referidos pelo nome em inglês do TMDB (o banco guarda o nome, e o id do TMDB de um
// tema não é algo que se saiba de cor); a infrastructure resolve nome → tema na hora de montar.
// Os pesos são valores de partida, calibrados contra o catálogo real (calibrate-feelings).

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
    // regra dura: o título precisa ter ao menos um destes gêneros do TMDB
    requireGenres: readonly number[];
    // regra dura: o título não pode ter nenhum destes
    excludeGenres: readonly number[];
    // sementes positivas: gêneros (id do TMDB) e temas (nome no TMDB), com peso
    genres: Readonly<Record<number, number>>;
    keywords: Readonly<Record<string, number>>;
    // sementes negativas: o que afasta sem proibir
    avoidGenres?: Readonly<Record<number, number>>;
    avoidKeywords?: Readonly<Record<string, number>>;
    // regra dura opcional: classificação indicativa máxima (sem classificação, não entra)
    maxCertification?: Certification;
};

export const CERTIFICATIONS = ["L", "10", "12", "14", "16", "18"] as const;
export type Certification = (typeof CERTIFICATIONS)[number];

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
    kids: 10762,
    mystery: 9648,
    reality: 10764,
    romance: 10749,
    sciFi: 878,
    sciFiFantasy: 10765,
    thriller: 53,
    war: 10752,
    warPolitics: 10768,
} as const;

// Documentário, reality e infantil nunca entram num sentimento: a calibração mostrou que eles
// dominam as receitas (muitos temas literais) sem ser o que a pessoa quer quando escolhe um.
const NEVER = [G.documentary, G.reality, G.kids];

export const FEELING_RECIPES: Record<Feeling, FeelingRecipe> = {
    laugh: {
        requireGenres: [G.comedy],
        // pesos negativos não bastaram (3ª calibração): One-Punch Man e Gavião Arqueiro seguiam
        excludeGenres: [...NEVER, G.horror, G.action, G.actionAdventure],
        genres: { [G.comedy]: 3 },
        keywords: {
            "buddy comedy": 2,
            parody: 1.5,
            satire: 1.5,
            "road trip": 1,
            "slapstick comedy": 1.5,
        },
        avoidGenres: { [G.war]: 1, [G.action]: 1, [G.actionAdventure]: 1, [G.animation]: 0.5 },
        avoidKeywords: { grief: 1.5, cancer: 1.5, suicide: 2 },
    },
    cry: {
        requireGenres: [G.drama],
        // a 2ª calibração trouxe Breaking Bad, Evangelion, WandaVision e Donnie Darko
        excludeGenres: [
            ...NEVER,
            G.horror,
            G.action,
            G.comedy,
            G.crime,
            G.mystery,
            G.thriller,
            G.sciFi,
            G.sciFiFantasy,
        ],
        genres: { [G.drama]: 2, [G.romance]: 0.5 },
        keywords: {
            grief: 2,
            loss: 1.5,
            "terminal illness": 2,
            "father son relationship": 1,
            "mother daughter relationship": 1,
            "tragic love": 1.5,
            "loss of loved one": 2,
        },
        avoidGenres: { [G.thriller]: 1, [G.crime]: 1 },
    },
    "nail-biting": {
        requireGenres: [G.thriller],
        excludeGenres: [...NEVER, G.family, G.animation, G.comedy],
        genres: { [G.thriller]: 3, [G.crime]: 1, [G.mystery]: 1 },
        keywords: {
            heist: 1.5,
            hostage: 1.5,
            "serial killer": 1,
            survival: 1,
            "race against time": 1.5,
            manhunt: 1.5,
        },
        avoidGenres: { [G.romance]: 1 },
    },
    scare: {
        requireGenres: [G.horror],
        excludeGenres: [...NEVER, G.family, G.animation, G.comedy],
        genres: { [G.horror]: 3 },
        keywords: { supernatural: 1.5, "haunted house": 2, possession: 1.5, slasher: 1.5 },
    },
    cozy: {
        requireGenres: [G.comedy, G.family, G.romance, G.animation],
        excludeGenres: [...NEVER, G.horror, G.thriller, G.crime, G.war, G.action],
        // a 2ª calibração trouxe Mr. Pickles e Sex Education: animação adulta não aquece
        maxCertification: "12",
        genres: { [G.family]: 1.5, [G.comedy]: 1.5, [G.romance]: 0.5, [G.animation]: 0.5 },
        keywords: {
            friendship: 1.5,
            "small town": 1.5,
            "found family": 2,
            heartwarming: 2,
            christmas: 1,
        },
        avoidKeywords: { death: 1, grief: 1.5, murder: 1.5 },
    },
    "mind-bending": {
        // sci-fi & fantasia de série sozinho é amplo demais (Outlander); exige mistério ou sci-fi
        requireGenres: [G.mystery, G.sciFi],
        // pesos negativos não bastaram (3ª calibração): Ultimato e Exterminador seguiam no topo
        excludeGenres: [
            ...NEVER,
            G.family,
            G.animation,
            G.comedy,
            G.romance,
            G.action,
            G.actionAdventure,
            G.horror,
        ],
        genres: { [G.mystery]: 1.5, [G.sciFi]: 1, [G.sciFiFantasy]: 1, [G.thriller]: 0.5 },
        keywords: {
            "time travel": 2,
            "plot twist": 2,
            "parallel world": 2,
            "time loop": 2,
            dystopia: 1,
            "nonlinear timeline": 1.5,
        },
        avoidGenres: { [G.action]: 1.5, [G.actionAdventure]: 1.5, [G.adventure]: 1 },
    },
    explosions: {
        requireGenres: [G.action, G.actionAdventure],
        excludeGenres: [...NEVER, G.family, G.animation],
        genres: { [G.action]: 3, [G.actionAdventure]: 3, [G.adventure]: 1, [G.thriller]: 0.5 },
        keywords: { chase: 1.5, shootout: 1.5, "martial arts": 1.5, explosion: 2, spy: 1 },
        avoidGenres: { [G.romance]: 1, [G.drama]: 0.5 },
    },
    swoon: {
        requireGenres: [G.romance],
        excludeGenres: [...NEVER, G.horror, G.thriller, G.animation],
        genres: { [G.romance]: 3, [G.comedy]: 0.5, [G.drama]: 0.5 },
        keywords: { "love at first sight": 1.5, "first love": 1.5, romcom: 2, "love": 1 },
    },
    "true-story": {
        requireGenres: [G.drama, G.history, G.crime, G.thriller, G.war, G.warPolitics],
        excludeGenres: [...NEVER, G.animation, G.comedy],
        genres: { [G.history]: 1.5, [G.drama]: 1, [G.crime]: 0.5 },
        keywords: {
            "based on true story": 3,
            biography: 2,
            "true crime": 2.5,
            "historical event": 1.5,
            "based on real person": 2,
        },
    },
};

/** Se o título passa pelas regras duras de gênero do sentimento. */
export function feelingAllows(
    feeling: Feeling,
    genreTmdbIds: readonly number[],
    certification: string | null = null,
): boolean {
    const recipe = FEELING_RECIPES[feeling];
    if (recipe.maxCertification) {
        const max = CERTIFICATIONS.indexOf(recipe.maxCertification);
        const actual = CERTIFICATIONS.indexOf(certification as Certification);
        if (actual < 0 || actual > max) return false;
    }
    return (
        genreTmdbIds.some((id) => recipe.requireGenres.includes(id)) &&
        !genreTmdbIds.some((id) => recipe.excludeGenres.includes(id))
    );
}

// O passeio de um sentimento volta mais vezes ao ponto de partida que o do gosto: o sentimento é
// sobre os temas e gêneros da receita, não sobre títulos parecidos com títulos parecidos.
export const FEELING_RESTART = 0.5;

// Quanto a qualidade (nota ponderada) pesa contra a proximidade do sentimento na ordem final.
export const FEELING_QUALITY_WEIGHT = 0.3;

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

export type FeelingCandidate = {
    id: number;
    genreTmdbIds: readonly number[];
    certification: string | null;
    // nota ponderada (estilo IMDb) já calculada; maior é melhor
    quality: number;
};

/**
 * Ordem final de um sentimento: só os títulos que passam pelas regras duras, ordenados por uma
 * mistura do percentil de proximidade no grafo com o percentil de qualidade. Sem a qualidade,
 * o topo vira títulos obscuros com o tema exato; sem o grafo, vira a lista dos mais bem avaliados.
 */
export function rankByFeeling(
    feeling: Feeling,
    graphScores: ReadonlyMap<number, number>,
    candidates: readonly FeelingCandidate[],
): number[] {
    const allowed = candidates.filter(
        (c) => graphScores.has(c.id) && feelingAllows(feeling, c.genreTmdbIds, c.certification),
    );
    const closeness = toPercentiles(new Map(allowed.map((c) => [c.id, graphScores.get(c.id)!])));
    const quality = toPercentiles(new Map(allowed.map((c) => [c.id, c.quality])));
    const w = FEELING_QUALITY_WEIGHT;
    return allowed
        .map((c) => ({
            id: c.id,
            score: (1 - w) * closeness.get(c.id)! + w * quality.get(c.id)!,
        }))
        .sort((a, b) => b.score - a.score)
        .map((c) => c.id);
}
