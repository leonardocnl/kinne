"use server";

import { after } from "next/server";
import { parseUsageEvent } from "@/domain/usage-events";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleUsageEventsRepository } from "@/infrastructure/db/usage-events-repository";

/**
 * Grava um evento da medição (03). Responde antes de gravar: as server actions do navegador saem
 * uma por vez, e o sorteio que vem depois não espera o banco. Evento inválido ou falha ao gravar
 * só ficam no log; a tela nunca sabe.
 */
export async function recordEvent(input: unknown): Promise<void> {
    const event = parseUsageEvent(input);
    if (!event) return;
    after(() =>
        new DrizzleUsageEventsRepository(createDb()).record(event).catch((error: unknown) => {
            console.error("Evento não gravado:", event.name, error);
        }),
    );
}
