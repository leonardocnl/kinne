import { z } from "zod";
import {
    EVENT_NAMES,
    RECOMMENDATION_SOURCES,
    isBrowserId,
    type UsageEvent,
} from "@/domain/usage-events";

export const usageEventSchema = z
    .strictObject({
        browserId: z.string().refine(isBrowserId),
        name: z.enum(EVENT_NAMES),
        source: z.enum(RECOMMENDATION_SOURCES).nullable(),
        titleId: z.int().positive().nullable(),
    })
    // a origem só existe em recommendation_shown
    .refine((e) => e.source === null || e.name === "recommendation_shown")
    .transform((e): UsageEvent => ({ ...e, browserId: e.browserId.toLowerCase() }));

/** O evento vem do navegador: só passa no formato esperado. Qualquer coisa fora disso é null. */
export function parseUsageEvent(value: unknown): UsageEvent | null {
    const parsed = usageEventSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

export interface UsageEventsRepository {
    // grava com a hora do banco, e não a do navegador
    record(event: UsageEvent): Promise<void>;
}

export type RecordOutcome = "recorded" | "invalid" | "failed";

/**
 * Grava um evento da medição (03) vindo do navegador. Nunca rejeita: evento inválido é ignorado,
 * e uma falha ao criar o repositório ou ao gravar só chega a `onError`. A medição não pode
 * derrubar a tela.
 */
export async function recordUsageEvent(
    input: unknown,
    repository: () => UsageEventsRepository,
    onError: (error: unknown, event: UsageEvent) => void,
): Promise<RecordOutcome> {
    const event = parseUsageEvent(input);
    if (!event) return "invalid";
    try {
        await repository().record(event);
        return "recorded";
    } catch (error) {
        onError(error, event);
        return "failed";
    }
}
