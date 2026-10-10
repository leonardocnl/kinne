export const KINNE_GENRES = ["action", "comedy", "drama", "romance", "suspense"] as const;

export type KinneGenre = (typeof KINNE_GENRES)[number];

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
