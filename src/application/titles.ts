import type { TitleType } from "@/domain/catalog";
import type { KinneGenre } from "@/domain/genre";
import type { FilterCandidate } from "@/domain/filters";
import type { SurpriseCandidate } from "@/domain/surprise";

// Um título com o que a tela do título mostra (US004 C1).
export type CatalogEntry = {
    id: number;
    slug: string;
    type: TitleType;
    title: string;
    tagline: string | null;
    synopsis: string | null;
    backdropImagePath: string | null;
    // largura do original no TMDB, para o srcset oferecer o original com o tamanho certo
    backdropWidth: number | null;
    trailerYoutubeKey: string | null;
    releaseYear: number | null;
    runtimeMinutes: number | null;
    rating: number;
    kinneGenres: KinneGenre[];
    // nomes em português dos gêneros do TMDB, para o título sem gênero do Kinne
    genreNames: string[];
    streamingTmdbIds: number[];
    // fora disso o título só chega pela busca: sem sorteio na tela (US007)
    recommendable: boolean;
    // todos os diretores e o começo do elenco, cada um na ordem dos créditos
    directors: string[];
    cast: string[];
};

// Um título que a surpresa (US003) e os filtros (US002) podem sortear.
export type Candidate = FilterCandidate & SurpriseCandidate;

export interface TitlesRepository {
    bySlug(slug: string): Promise<CatalogEntry | null>;
    // títulos em algum streaming, com o que a surpresa (US003) e os filtros (US002) sorteiam
    candidates(): Promise<Candidate[]>;
}
