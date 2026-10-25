"use server";

import "server-only";
import { after } from "next/server";
import { recordUsageEvent } from "@/application/usage-events";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleUsageEventsRepository } from "@/infrastructure/db/usage-events-repository";

/**
 * Grava um evento da medição (03). Responde antes de gravar: as server actions do navegador saem
 * uma por vez, e o sorteio que vem depois não espera o banco. Evento inválido ou falha ao gravar
 * só ficam no log; a tela nunca sabe.
 */
export async function recordEvent(input: unknown): Promise<void> {
    after(() =>
        recordUsageEvent(
            input,
            () => new DrizzleUsageEventsRepository(createDb()),
            (error, event) => console.error("Evento não gravado:", event.name, error),
        ),
    );
}
