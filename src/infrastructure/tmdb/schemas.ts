import { z } from "zod";
import { sanitizeText } from "@/domain/catalog";

// O TMDB é fronteira não confiável (threat model catalog-sync, A1–A6). Chaves desconhecidas são
// descartadas (o TMDB manda dezenas); o que usamos passa por limites de tamanho e de faixa.
// Campo opcional inválido vira null (recusa o campo); campo obrigatório inválido recusa o título.

export const LIMITS = { title: 300, synopsis: 2000, tagline: 300, personName: 200, tag: 200 };

const id = z.number().int().positive().max(2_147_483_647);

// Texto opcional: sanitizado (A4); acima do limite, null (A5).
const optionalText = (max: number) =>
    z
        .string()
        .nullish()
        .transform((s) => sanitizeText(s, max))
        .catch(null);

// Texto obrigatório: sem ele o título é recusado.
const requiredText = (max: number) =>
    z
        .string()
        .transform((s) => sanitizeText(s, max))
        .pipe(z.string());

// Só o caminho; a URL completa é montada pelo app (A2).
export const IMAGE_PATH = /^\/[A-Za-z0-9]+\.(jpg|png)$/;
const imagePath = z.string().regex(IMAGE_PATH).nullish().catch(null);

const YOUTUBE_KEY = /^[A-Za-z0-9_-]{11}$/;

const languageCode = z
    .string()
    .regex(/^[a-z]{2}$/)
    .nullable()
    .catch(null);

// "2017-03-03" → 2017; vazio → null; fora da faixa recusa o título (A6).
const MAX_YEAR = new Date().getUTCFullYear() + 5;
const releaseYear = z
    .string()
    .nullish()
    .transform((d) => (d ? Number(d.slice(0, 4)) : null))
    .pipe(z.number().int().min(1870).max(MAX_YEAR).nullable());

const runtime = z.number().int().min(0).max(1440);

const tag = z.object({ id, name: requiredText(LIMITS.tag) });

// Entradas inválidas de listas (vídeos, imagens, pessoas, etiquetas) são descartadas uma a uma.
const listOf = <T extends z.ZodType>(item: T) =>
    z
        .array(z.unknown())
        .max(10_000)
        .catch([])
        .transform((items) =>
            items.flatMap((i) => {
                const r = item.safeParse(i);
                return r.success ? [r.data as z.output<T>] : [];
            }),
        );

// Só YouTube, com chave no formato do YouTube (A3).
const video = z.object({
    site: z.literal("YouTube"),
    type: z.string().max(50),
    key: z.string().regex(YOUTUBE_KEY),
    iso_639_1: languageCode,
});

const image = z.object({
    file_path: z.string().regex(IMAGE_PATH),
    width: z.number().int().positive().max(20_000),
    iso_639_1: languageCode,
});

const person = { id, name: requiredText(LIMITS.personName) };
const credits = z
    .object({
        cast: listOf(z.object({ ...person, order: z.number().int().min(0).max(10_000) })),
        crew: listOf(z.object({ ...person, job: z.string().max(100) })),
    })
    .catch({ cast: [], crew: [] });

const common = {
    id,
    original_language: z.string().regex(/^[a-z]{2,3}$/),
    tagline: optionalText(LIMITS.tagline),
    overview: optionalText(LIMITS.synopsis),
    poster_path: imagePath,
    vote_average: z.number().min(0).max(10),
    vote_count: z.number().int().min(0).max(100_000_000),
    genres: listOf(tag),
    videos: z.object({ results: listOf(video) }).catch({ results: [] }),
    images: z.object({ backdrops: listOf(image) }).catch({ backdrops: [] }),
    credits,
};

const countryCode = z.string().regex(/^[A-Z]{2}$/);
const certification = z.string().max(20);

export const movieDetailsSchema = z.object({
    ...common,
    title: requiredText(LIMITS.title),
    original_title: requiredText(LIMITS.title),
    release_date: releaseYear,
    runtime: runtime.nullish(),
    keywords: z.object({ keywords: listOf(tag) }).catch({ keywords: [] }),
    release_dates: z
        .object({
            results: listOf(
                z.object({
                    iso_3166_1: countryCode,
                    release_dates: listOf(z.object({ certification })),
                }),
            ),
        })
        .catch({ results: [] }),
});

export const seriesDetailsSchema = z.object({
    ...common,
    name: requiredText(LIMITS.title),
    original_name: requiredText(LIMITS.title),
    first_air_date: releaseYear,
    episode_run_time: z.array(runtime).max(100).catch([]),
    keywords: z.object({ results: listOf(tag) }).catch({ results: [] }),
    content_ratings: z
        .object({ results: listOf(z.object({ iso_3166_1: countryCode, rating: certification })) })
        .catch({ results: [] }),
});

const page = z.number().int().min(1).max(100_000);
export const discoverPageSchema = z.object({
    page,
    total_pages: z.number().int().min(0),
    total_results: z.number().int().min(0),
    results: z.array(z.object({ id })),
});

export const changesPageSchema = z.object({
    page,
    total_pages: z.number().int().min(0),
    results: z.array(z.object({ id })),
});
