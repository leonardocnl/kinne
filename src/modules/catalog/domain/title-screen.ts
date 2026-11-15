import type { StreamingService } from "./streaming";

// Uma pessoa do elenco e o personagem, quando o TMDB informa (US004 C12).
export type CastMember = { name: string; character: string | null };

// Um título já pronto para a tela do título (US004 C1).
export type TitleScreen = {
    id: number;
    slug: string;
    title: string;
    tagline: string | null;
    synopsis: string | null;
    // na origem "dia" vira o gênero em que o título foi indicado
    genre: string | null;
    year: string | null;
    runtime: string | null;
    score: string;
    streamings: StreamingService[];
    trailerUrl: string | null;
    backdropImagePath: string | null;
    // pôster à esquerda do texto, só no computador
    posterImagePath: string | null;
    backdropWidth: number | null;
    // não recomendável: sem dado, sem "Outra opção" e fora dos buscadores (busca H6)
    recommendable: boolean;
    // "X", "X e Y" ou "X, Y e Z"; null quando não há diretor
    directors: string | null;
    // o elenco guardado, sem repetidos, com o personagem; vazio sem elenco (C12)
    cast: CastMember[];
};
