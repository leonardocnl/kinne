import { describe, expect, it } from "vitest";
import type { TitleType } from "@/domain/catalog";
import {
    changesWindow,
    syncCatalog,
    type CatalogRepository,
    type CatalogSource,
    type CatalogTitle,
    type DetailsResult,
    type ExistingTitle,
    type FinalizePlan,
    type TitleDetails,
} from "./sync-catalog";

const NETFLIX = 8;

const details = (tmdbId: number, change: Partial<TitleDetails> = {}): TitleDetails => ({
    tmdbId,
    type: "movie",
    displayTitle: `Filme ${tmdbId}`,
    originalTitle: `Movie ${tmdbId}`,
    tagline: null,
    synopsis: "Sinopse.",
    posterImagePath: null,
    backdrop: { path: "/b.jpg", width: 1920 },
    trailerYoutubeKey: null,
    trailerLanguageCode: null,
    releaseYear: 2020,
    runtimeMinutes: 100,
    rating: 7,
    voteCount: 100,
    certification: "14",
    certificationSource: "br",
    genres: [],
    keywords: [],
    credits: [],
    ...change,
});

// Fonte: todos os ids em Netflix; detalhes por id, ou "rejected".
function fakeSource(ids: number[], rejected: number[] = []): CatalogSource & { fetched: number[] } {
    const fetched: number[] = [];
    return {
        requestCount: 0,
        fetched,
        discover: async (type, streaming) => (type === "movie" && streaming === NETFLIX ? ids : []),
        changedIds: async () => new Set(),
        details: async (_type: TitleType, id: number): Promise<DetailsResult> => {
            fetched.push(id);
            return rejected.includes(id)
                ? { status: "rejected" }
                : { status: "ok", title: details(id) };
        },
    };
}

// Repositório em memória com a mesma semântica do Drizzle.
function fakeRepository(seed: (Partial<ExistingTitle> & { tmdbId: number })[] = []) {
    let nextId = 1;
    const rows = new Map<string, ExistingTitle & { title?: CatalogTitle }>();
    for (const s of seed) {
        const id = nextId++;
        rows.set(`movie:${s.tmdbId}`, {
            id,
            type: "movie",
            slug: `filme-${s.tmdbId}-2020`,
            isActive: true,
            isBlocked: false,
            isRecommendable: false,
            referenced: false,
            hasSynopsis: true,
            hasBackdrop: true,
            voteCount: 100,
            certification: "14",
            ...s,
        });
    }
    const availability = new Set(
        [...rows.values()].filter((r) => r.isActive).map((r) => `${r.id}:${NETFLIX}`),
    );
    const plans: FinalizePlan[] = [];
    const repo: CatalogRepository = {
        existingTitles: async () =>
            [...rows.values()].map((r) => {
                const copy = { ...r };
                delete copy.title;
                return copy;
            }),
        availability: async () =>
            [...availability].map((a) => {
                const [titleId, streamingTmdbId] = a.split(":").map(Number);
                return { titleId, streamingTmdbId };
            }),
        saveBatch: async (titles) => {
            const inserted: string[] = [];
            const updated: string[] = [];
            for (const t of titles) {
                const k = `${t.type}:${t.tmdbId}`;
                const old = rows.get(k);
                const same = old?.title && JSON.stringify(old.title) === JSON.stringify(t);
                if (!old) inserted.push(t.slug);
                else if (!same) updated.push(old.slug);
                rows.set(k, {
                    id: old?.id ?? nextId++,
                    tmdbId: t.tmdbId,
                    type: t.type,
                    slug: old?.slug ?? t.slug,
                    isActive: old?.isActive ?? true,
                    isBlocked: old?.isBlocked ?? false,
                    isRecommendable: old?.isRecommendable ?? false,
                    referenced: old?.referenced ?? false,
                    hasSynopsis: !!t.synopsis,
                    hasBackdrop: !!t.backdrop,
                    voteCount: t.voteCount,
                    certification: t.certification,
                    title: t,
                });
            }
            return { inserted, updated };
        },
        finalize: async (plan) => {
            plans.push(plan);
            for (const a of plan.availabilityToRemove)
                availability.delete(`${a.titleId}:${a.streamingTmdbId}`);
            for (const a of plan.availabilityToAdd)
                availability.add(`${a.titleId}:${a.streamingTmdbId}`);
            for (const r of rows.values()) {
                if (plan.reactivateIds.includes(r.id)) r.isActive = true;
                if (plan.inactivateIds.includes(r.id)) r.isActive = false;
                if (plan.recommendableIds.includes(r.id)) r.isRecommendable = true;
                if (plan.notRecommendableIds.includes(r.id)) r.isRecommendable = false;
            }
            for (const [k, r] of rows) if (plan.deleteIds.includes(r.id)) rows.delete(k);
        },
    };
    return { repo, rows, plans };
}

const full = { start: null, end: new Date("2026-10-12T06:00:00Z") };
const range = (n: number, from = 1) => Array.from({ length: n }, (_, i) => i + from);

describe("syncCatalog", () => {
    it("primeira carga grava tudo; a segunda, com os mesmos dados, não muda nada (B4)", async () => {
        const { repo } = fakeRepository();
        const first = await syncCatalog(fakeSource(range(30)), repo, full);
        expect(first.status).toBe("ok");
        expect(first.counts).toMatchObject({
            inserted: 30,
            total: 30,
            active: 30,
            recommendable: 30,
        });

        const second = await syncCatalog(fakeSource(range(30)), repo, full);
        expect(second.counts).toMatchObject({
            inserted: 0,
            updated: 0,
            deleted: 0,
            inactivated: 0,
        });
        expect(second.changedSlugs).toEqual([]);
    });

    it("na janela do /changes só busca novos e alterados", async () => {
        const { repo } = fakeRepository(range(5).map((tmdbId) => ({ tmdbId })));
        const source = fakeSource(range(6));
        source.changedIds = async (type) => new Set(type === "movie" ? [2] : []);
        await syncCatalog(source, repo, { start: new Date("2026-10-11T00:00:00Z"), end: full.end });
        expect(source.fetched.sort()).toEqual([2, 6]);
    });

    it("apaga quem saiu e não é referenciado; inativa quem é (B6)", async () => {
        const seed = range(100).map((tmdbId) => ({ tmdbId, referenced: tmdbId === 2 }));
        const { repo, rows } = fakeRepository(seed);
        const r = await syncCatalog(fakeSource(range(98, 3)), repo, full);
        expect(r.counts).toMatchObject({ deleted: 1, inactivated: 1 });
        expect(rows.has("movie:1")).toBe(false);
        expect(rows.get("movie:2")?.isActive).toBe(false);
        expect(rows.get("movie:2")?.isRecommendable).toBe(false);
    });

    it("válvula: aborta sem remover nada acima de 5% (B1, B11)", async () => {
        const { repo, rows, plans } = fakeRepository(range(100).map((tmdbId) => ({ tmdbId })));
        const r = await syncCatalog(fakeSource(range(94, 7)), repo, full);
        expect(r.status).toBe("aborted");
        expect(r.abortReason).toMatch(/válvula/);
        expect(plans).toEqual([]);
        expect(rows.size).toBe(100);
    });

    it("TMDB vazio não apaga o catálogo (B1)", async () => {
        const { repo, plans } = fakeRepository(range(100).map((tmdbId) => ({ tmdbId })));
        expect((await syncCatalog(fakeSource([]), repo, full)).status).toBe("aborted");
        expect(plans).toEqual([]);
    });

    it("recusas acima de 2% abortam; recusado nunca conta como ausente (B2)", async () => {
        const { repo, plans } = fakeRepository(range(100).map((tmdbId) => ({ tmdbId })));
        const r = await syncCatalog(fakeSource(range(100), range(3)), repo, full);
        expect(r.status).toBe("aborted");
        expect(r.abortReason).toMatch(/recusas/);
        expect(r.counts.rejected).toBe(3);
        expect(plans).toEqual([]);

        const ok = await syncCatalog(fakeSource(range(100), [1, 2]), repo, full);
        expect(ok.status).toBe("ok");
        expect(ok.counts).toMatchObject({ rejected: 2, deleted: 0, inactivated: 0 });
    });

    it("slug fica fixo e colisão ganha sufixo numérico (B9)", async () => {
        const { repo, rows } = fakeRepository([{ tmdbId: 1, slug: "filme-2-2020" }]);
        await syncCatalog(fakeSource([1, 2]), repo, full);
        expect(rows.get("movie:1")?.slug).toBe("filme-2-2020");
        expect(rows.get("movie:2")?.slug).toBe("filme-2-2020-2");
    });

    it("bloqueado nunca é recomendável e sai do cache (C5)", async () => {
        const { repo, rows } = fakeRepository([{ tmdbId: 1, isBlocked: true }]);
        const r = await syncCatalog(fakeSource([1]), repo, full);
        expect(rows.get("movie:1")?.isRecommendable).toBe(false);
        expect(r.changedSlugs).toContain("filme-1-2020");
    });
});

describe("changesWindow (B12)", () => {
    it("começa um dia antes do fim da última carga boa, em UTC", () => {
        const w = changesWindow(new Date("2026-10-11T06:30:00Z"), new Date("2026-10-12T06:30:00Z"));
        expect(w.start?.toISOString()).toBe("2026-10-10T06:30:00.000Z");
        expect(w.end.toISOString()).toBe("2026-10-12T06:30:00.000Z");
    });

    it("sem carga anterior busca tudo", () => {
        expect(changesWindow(null, new Date()).start).toBeNull();
    });
});
