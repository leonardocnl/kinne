import type { UsageEvent } from "@/domain/usage-events";

export interface UsageEventsRepository {
    // grava com a hora do banco, e não a do navegador
    record(event: UsageEvent): Promise<void>;
}
