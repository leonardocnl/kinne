import "server-only";
import { and, count, gte, lt } from "drizzle-orm";
import type { EventRange, TestEventsRepository } from "@/application/delete-test-events";
import type { UsageEventsRepository } from "@/application/usage-events";
import type { UsageEvent } from "@/domain/usage-events";
import type { Db } from "./client";
import { anonymousUsageEvents } from "./schema";

export class DrizzleUsageEventsRepository implements UsageEventsRepository, TestEventsRepository {
    constructor(private readonly db: Db) {}

    async record(event: UsageEvent) {
        await this.db.insert(anonymousUsageEvents).values({
            anonymousBrowserId: event.browserId,
            eventName: event.name,
            recommendationSource: event.source,
            catalogTitleId: event.titleId,
        });
    }

    async countBetween(range: EventRange) {
        const [row] = await this.db
            .select({ total: count() })
            .from(anonymousUsageEvents)
            .where(inRange(range));
        return row?.total ?? 0;
    }

    async deleteBetween(range: EventRange) {
        const deleted = await this.db
            .delete(anonymousUsageEvents)
            .where(inRange(range))
            .returning({ id: anonymousUsageEvents.id });
        return deleted.length;
    }
}

const inRange = ({ start, end }: EventRange) =>
    and(gte(anonymousUsageEvents.occurredAt, start), lt(anonymousUsageEvents.occurredAt, end));
