import { z } from "zod";
import { isStreaming, STREAMING_SERVICES } from "@/domain/streaming";
import { idListSchema, tasteSchema } from "./taste";

export const surpriseRequestSchema = z.strictObject({
    streamings: z.array(z.string().refine(isStreaming)).max(STREAMING_SERVICES.length),
    watched: idListSchema,
    shown: idListSchema,
    // os sinais de gosto do navegador (US009)
    taste: tasteSchema,
});

export type SurpriseDrawRequest = z.infer<typeof surpriseRequestSchema>;

/** O pedido vem do navegador: só passa no formato e no tamanho esperados. */
export function parseSurpriseRequest(input: unknown): SurpriseDrawRequest {
    const parsed = surpriseRequestSchema.safeParse(input);
    // mensagem fixa: nada do pedido volta ao navegador nem ao log
    if (!parsed.success) throw new Error("Pedido inválido");
    return parsed.data;
}
