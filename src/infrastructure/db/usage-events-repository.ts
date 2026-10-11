import type { UsageEventsRepository } from "@/application/usage-events";
import type { UsageEvent } from "@/domain/usage-events";
import type { Db } from "./client";
import { anonymousUsageEvents } from "./schema";

export class DrizzleUsageEventsRepository implements UsageEventsRepository {
    constructor(private readonly db: Db) {}

    async record(event: UsageEvent) {
        await this.db.insert(anonymousUsageEvents).values({
            anonymousBrowserId: event.browserId,
            eventName: event.name,
            recommendationSource: event.source,
            catalogTitleId: event.titleId,
        });
    }
}
