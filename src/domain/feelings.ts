import { toPercentiles } from "./taste-graph";

// Escolha por sentimento (docs/design/taste-graph.md §5): classificação sobre o próprio título,
// sem andar pelo grafo. Cada sentimento tem regras duras (gêneros exigidos e proibidos, teto de
// classificação) e uma receita de afinidade (gêneros e temas com peso).
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
        // pesos negativos não bastaram (3ª calibração): One-Punch Man e Gavião Arqueiro
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
        // sci-fi & fantasia de série sozinho é amplo demais (Outlander): exige mistério
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
        keywords: { "love at first sight": 1.5, "first love": 1.5, romcom: 2, love: 1 },
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

// Quanto a qualidade (nota ponderada) pesa contra a afinidade na ordem final.
export const FEELING_QUALITY_WEIGHT = 0.3;
// Peso de um gênero da receita frente a um tema: gênero é amplo e diz pouco do sentimento.
const GENRE_SCALE = 0.3;

/** A receita com os temas já resolvidos para ids do TMDB; temas que o catálogo não tem saem. */
export type ResolvedRecipe = {
    genres: ReadonlyMap<number, number>;
    themes: ReadonlyMap<number, number>;
};

export function resolveRecipe(
    feeling: Feeling,
    resolveTheme: (name: string) => number | undefined,
): ResolvedRecipe {
    const recipe = FEELING_RECIPES[feeling];
    const genres = new Map<number, number>();
    for (const [id, w] of Object.entries(recipe.genres)) genres.set(Number(id), w);
    for (const [id, w] of Object.entries(recipe.avoidGenres ?? {})) {
        genres.set(Number(id), (genres.get(Number(id)) ?? 0) - w);
    }
    const themes = new Map<number, number>();
    const addThemes = (entries: Readonly<Record<string, number>>, sign: number) => {
        for (const [name, w] of Object.entries(entries)) {
            const id = resolveTheme(name);
            if (id !== undefined) themes.set(id, (themes.get(id) ?? 0) + sign * w);
        }
    };
    addThemes(recipe.keywords, 1);
    addThemes(recipe.avoidKeywords ?? {}, -1);
    return { genres, themes };
}

export type FeelingCandidate = {
    id: number;
    genreTmdbIds: readonly number[];
    themeTmdbIds: readonly number[];
    certification: string | null;
    // nota ponderada (estilo IMDb) já calculada; maior é melhor
    quality: number;
};

/**
 * Afinidade de um título com a receita: cada tema da receita que o título tem vale o peso dele
 * vezes a raridade do tema (um tema raro diz mais), e cada gênero vale o seu peso, em escala
 * menor. Pesos negativos (o que afasta) subtraem.
 */
export function feelingAffinity(
    recipe: ResolvedRecipe,
    candidate: Pick<FeelingCandidate, "genreTmdbIds" | "themeTmdbIds">,
    themeRarity: (themeTmdbId: number) => number,
): number {
    let score = 0;
    for (const id of new Set(candidate.themeTmdbIds)) {
        const w = recipe.themes.get(id);
        if (w !== undefined) score += w * themeRarity(id);
    }
    for (const id of new Set(candidate.genreTmdbIds)) {
        score += GENRE_SCALE * (recipe.genres.get(id) ?? 0);
    }
    return score;
}

/**
 * Ordem final de um sentimento: só os títulos que passam pelas regras duras, por 70% percentil
 * de afinidade + 30% percentil de qualidade. Sem a qualidade, o topo vira títulos obscuros com o
 * tema exato; sem a afinidade, vira a lista dos mais bem avaliados.
 */
export function rankByFeeling(
    feeling: Feeling,
    recipe: ResolvedRecipe,
    candidates: readonly FeelingCandidate[],
    themeRarity: (themeTmdbId: number) => number,
): number[] {
    const allowed = candidates.filter((c) =>
        feelingAllows(feeling, c.genreTmdbIds, c.certification),
    );
    const affinity = toPercentiles(
        new Map(allowed.map((c) => [c.id, feelingAffinity(recipe, c, themeRarity)])),
    );
    const quality = toPercentiles(new Map(allowed.map((c) => [c.id, c.quality])));
    const w = FEELING_QUALITY_WEIGHT;
    return allowed
        .map((c) => ({ id: c.id, score: (1 - w) * affinity.get(c.id)! + w * quality.get(c.id)! }))
        .sort((a, b) => b.score - a.score || a.id - b.id)
        .map((c) => c.id);
}
