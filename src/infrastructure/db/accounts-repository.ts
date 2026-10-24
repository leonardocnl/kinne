import "server-only";
import type {
    AccountsRepository,
    BrowserData,
    SignInStatus,
    StoredAccount,
    StoredTaste,
} from "@/application/accounts";
import type { Streaming } from "@/domain/streaming";
import type { Db } from "./client";
import * as q from "./accounts-sql";

type Statement = Parameters<Db["execute"]>[0];

// O driver HTTP devolve jsonb já como objeto; por garantia, aceita o texto também.
const parsed = <T>(value: unknown): T =>
    (typeof value === "string" ? JSON.parse(value) : value) as T;

export class DrizzleAccountsRepository implements AccountsRepository {
    constructor(private readonly db: Db) {}

    private async one<T>(statement: Statement): Promise<T | null> {
        const rows = (await this.db.execute(statement)).rows as { result: T | null }[];
        return rows[0]?.result ?? null;
    }

    async requestCode(input: { emailHash: string; codeHash: string }) {
        await this.one(q.requestCode(input));
    }

    async signIn(input: {
        emailHash: string;
        email: string;
        codeHash: string;
        tokenHash: string;
        browser: BrowserData;
    }) {
        const { browser, ...rest } = input;
        const result = parsed<{ status: SignInStatus; isNew?: boolean }>(
            await this.one(
                q.signIn({
                    ...rest,
                    streamings: browser.streamings,
                    watched: browser.watched,
                    liked: browser.taste.liked,
                    willWatch: browser.taste.willWatch,
                    disliked: browser.taste.disliked,
                }),
            ),
        );
        return { status: result.status, isNew: result.isNew === true };
    }

    sessionUser(tokenHash: string) {
        return this.one<number>(q.sessionUser(tokenHash));
    }

    sessionEmail(tokenHash: string) {
        return this.one<string>(q.sessionEmail(tokenHash));
    }

    async signOut(tokenHash: string) {
        return (await this.one<boolean>(q.signOut(tokenHash))) === true;
    }

    async signOutAll(tokenHash: string) {
        return (await this.one<number>(q.signOutAll(tokenHash))) ?? 0;
    }

    async setStreamings(tokenHash: string, streamings: readonly Streaming[]) {
        return (await this.one<boolean>(q.setStreamings(tokenHash, streamings))) === true;
    }

    async setSignal(tokenHash: string, titleId: number, signal: string | null) {
        return (await this.one<boolean>(q.setSignal(tokenHash, titleId, signal))) === true;
    }

    async setWatched(tokenHash: string, titleId: number, on: boolean) {
        return (await this.one<boolean>(q.setWatched(tokenHash, titleId, on))) === true;
    }

    async onboardingStep(input: Parameters<AccountsRepository["onboardingStep"]>[0]) {
        return (await this.one<boolean>(q.onboardingStep(input))) === true;
    }

    async requestDeleteCode(tokenHash: string, codeHash: string) {
        return (await this.one<boolean>(q.requestDeleteCode(tokenHash, codeHash))) === true;
    }

    async deleteAccount(tokenHash: string, codeHash: string) {
        const result = await this.one<string>(q.deleteAccount(tokenHash, codeHash));
        return (result ?? "no_session") as "ok" | "invalid" | "locked" | "no_session";
    }

    async load(userId: number): Promise<StoredAccount> {
        return parsed<StoredAccount>(await this.one(q.loadAccount(userId)));
    }

    async loadTaste(userId: number): Promise<StoredTaste> {
        return parsed<StoredTaste>(await this.one(q.loadTaste(userId)));
    }

    /** Ids do catálogo para os slugs (o servidor deriva os ids; o navegador só manda slugs). */
    async titleIds(slugs: readonly string[]): Promise<Map<string, number>> {
        if (slugs.length === 0) return new Map();
        const rows = (await this.db.execute(q.titleIdsBySlugs(slugs))).rows as {
            id: number;
            slug: string;
        }[];
        return new Map(rows.map((r) => [r.slug, r.id]));
    }
}
