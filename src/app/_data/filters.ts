import { z } from "zod";
import { KINNE_GENRES, isKinneGenre } from "@/domain/genre";
import { MIN_RATING } from "@/domain/catalog";
import { MAX_PERSON_ID } from "@/domain/person-search";
import { isStreaming, STREAMING_SERVICES } from "@/domain/streaming";
import { MAX_RATING, RUNTIME_LIMITS, TYPES, type Filters } from "@/domain/filters";
import { idListSchema } from "./surprise";

const unique = (list: readonly string[]) => new Set(list).size === list.length;

const filtersSchema = z.strictObject({
    streamings: z
        .array(z.string().refine(isStreaming))
        .max(STREAMING_SERVICES.length)
        .refine(unique),
    type: z.enum(TYPES as [Filters["type"], ...Filters["type"][]]),
    genres: z.array(z.string().refine(isKinneGenre)).max(KINNE_GENRES.length).refine(unique),
    // o slider anda de 0,1 em 0,1; o arredondamento tira o 7,199999… do ponto flutuante
    minRating: z
        .number()
        .min(MIN_RATING)
        .max(MAX_RATING)
        .refine((n) => Math.abs(n * 10 - Math.round(n * 10)) < 1e-6)
        .transform((n) => Math.round(n * 10) / 10),
    maxRuntime: z.custom<number | null>((v) => RUNTIME_LIMITS.some((l) => l.minutes === v)),
    // person-search A6, A7: só o id; os títulos da pessoa o servidor deriva
    personId: z.int().min(1).max(MAX_PERSON_ID).nullable(),
});

// marcados quando os filtros abriram: o marcado depois conta como uma das 10 (US005 RNE001);
// já mostrados desde "Ver recomendação", para "Outra opção" não repetir (US004 C2)
export const filterRequestSchema = z.strictObject({
    filters: filtersSchema,
    watched: idListSchema,
    seen: idListSchema,
});

export type FilterRequest = z.infer<typeof filterRequestSchema>;

/** O pedido de sorteio vem do navegador: só passa no formato e no tamanho esperados. */
export function parseFilterRequest(input: unknown): FilterRequest {
    const parsed = filterRequestSchema.safeParse(input);
    if (!parsed.success) throw new Error("Pedido inválido");
    return parsed.data;
}
