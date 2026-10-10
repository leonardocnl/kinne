export const KINNE_GENRES = ["action", "comedy", "drama", "romance", "suspense"] as const;

export type KinneGenre = (typeof KINNE_GENRES)[number];

export function isKinneGenre(value: string): value is KinneGenre {
    return (KINNE_GENRES as readonly string[]).includes(value);
}

export const GENRE_LABELS: Record<KinneGenre, string> = {
    action: "Ação",
    comedy: "Comédia",
    drama: "Drama",
    romance: "Romance",
    suspense: "Suspense",
};

// Gêneros do TMDB (filme e série) que viram um gênero do Kinne; os demais ficam de fora.
const BY_TMDB_GENRE_ID: Record<number, KinneGenre> = {
    28: "action",
    10759: "action",
    35: "comedy",
    18: "drama",
    10749: "romance",
    53: "suspense",
    9648: "suspense",
};

export function kinneGenreFor(tmdbGenreId: number): KinneGenre | null {
    return BY_TMDB_GENRE_ID[tmdbGenreId] ?? null;
}

// O banco não guarda a ordem dos gêneros do TMDB. Com vários, vale o mais específico; drama, o mais
// amplo, fica por último.
const MAIN_GENRE_ORDER: readonly KinneGenre[] = [
    "action",
    "suspense",
    "comedy",
    "romance",
    "drama",
];

export function mainGenre(genres: readonly KinneGenre[]): KinneGenre | null {
    return MAIN_GENRE_ORDER.find((g) => genres.includes(g)) ?? null;
}
