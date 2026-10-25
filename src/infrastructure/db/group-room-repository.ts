import "server-only";
import type {
    CreateOutcome,
    GroupRoomRepository,
    ProposalInput,
    RoomSnapshot,
    StoredTally,
} from "@/application/group-room";
import type { Db } from "./client";
import * as q from "./group-room-sql";

// Código PostgreSQL de unique_violation: o código sorteado já existe (quem chama sorteia outro).
const UNIQUE_VIOLATION = "23505";

function pgCode(error: unknown): string | undefined {
    const e = error as { code?: string; cause?: { code?: string } } | null;
    return e?.code ?? e?.cause?.code;
}

// O driver HTTP devolve jsonb já como objeto; por garantia, aceita o texto também.
const parsed = <T>(value: unknown): T =>
    (typeof value === "string" ? JSON.parse(value) : value) as T;

export class DrizzleGroupRoomRepository implements GroupRoomRepository {
    constructor(private readonly db: Db) {}

    private async rows<T>(statement: Parameters<Db["execute"]>[0]): Promise<T[]> {
        return (await this.db.execute(statement)).rows as T[];
    }

    private async changed(statement: Parameters<Db["execute"]>[0]): Promise<boolean> {
        return (await this.rows(statement)).length > 0;
    }

    async create(input: Parameters<GroupRoomRepository["create"]>[0]): Promise<CreateOutcome> {
        try {
            const [row] = await this.rows<{ result: number | null }>(q.createRoom(input));
            return row?.result ? { kind: "created" } : { kind: "limited" };
        } catch (error) {
            if (pgCode(error) === UNIQUE_VIOLATION) return { kind: "code-taken" };
            throw error;
        }
    }

    async join(input: Parameters<GroupRoomRepository["join"]>[0]): Promise<boolean> {
        const [row] = await this.rows<{ result: number | null }>(q.joinRoom(input));
        return Boolean(row?.result);
    }

    async leave(tokenHash: string): Promise<"left" | "ended" | null> {
        const [row] = await this.rows<{ result: "left" | "ended" | null }>(q.leaveRoom(tokenHash));
        return row?.result ?? null;
    }

    async purge(): Promise<void> {
        await this.rows(q.purgeRooms());
    }

    async snapshot(tokenHash: string): Promise<RoomSnapshot | null> {
        const [row] = await this.rows<{ state: unknown }>(q.snapshot(tokenHash));
        return row ? parsed<RoomSnapshot>(row.state) : null;
    }

    async proposalInput(tokenHash: string): Promise<ProposalInput | null> {
        const [row] = await this.rows<{ input: unknown }>(q.proposalInput(tokenHash));
        return row ? parsed<ProposalInput>(row.input) : null;
    }

    async tallies(tokenHash: string): Promise<StoredTally[]> {
        return this.rows<StoredTally>(q.tallies(tokenHash));
    }

    updatePreferences(input: Parameters<GroupRoomRepository["updatePreferences"]>[0]) {
        return this.changed(q.updatePreferences(input));
    }

    updateSettings(input: Parameters<GroupRoomRepository["updateSettings"]>[0]) {
        return this.changed(q.updateSettings(input));
    }

    startVoting(input: Parameters<GroupRoomRepository["startVoting"]>[0]) {
        return this.changed(q.startVoting(input));
    }

    nextRound(input: Parameters<GroupRoomRepository["nextRound"]>[0]) {
        return this.changed(q.nextRound(input));
    }

    castVote(input: Parameters<GroupRoomRepository["castVote"]>[0]) {
        return this.changed(q.castVote(input));
    }

    closeVoting(tokenHash: string) {
        return this.changed(q.closeVoting(tokenHash));
    }

    closeIfEveryoneVoted(tokenHash: string) {
        return this.changed(q.closeIfEveryoneVoted(tokenHash));
    }
}
