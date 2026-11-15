import type { BrCertification } from "./catalog-sync";
import type { TitleType } from "./catalog";
import type { KinneGenre } from "./genre";

export type TypeChoice = TitleType | "both";

export type SurpriseCandidate = {
    id: number;
    slug: string;
    rating: number;
    votes: number;
    streamingTmdbIds: readonly number[];
    // classificação 18: a surpresa nunca os sorteia (recommendation-rounds A2)
    adult: boolean;
};

// Sem o slug: a lista vai inteira ao navegador para o contador, e o slug dobraria o tamanho.
export type CatalogCandidate = Omit<SurpriseCandidate, "slug"> & {
    type: TitleType;
    runtimeMinutes: number | null;
    certification: BrCertification | null;
    kinneGenres: readonly KinneGenre[];
    // todos os gêneros do TMDB, para os conflitos e a pureza (US017)
    genreTmdbIds: readonly number[];
};
