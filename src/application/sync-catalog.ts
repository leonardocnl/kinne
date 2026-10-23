import { baseSlug, uniqueSlug, type TitleType } from "@/domain/catalog";
import {
    exceedsRejectThreshold,
    exceedsSafetyValve,
    isRecommendable,
    planRemovals,
    type BrCertification,
    type CertificationSource,
} from "@/domain/catalog-sync";
import { STREAMING_SERVICES } from "@/domain/streaming";

export type Tag = { tmdbId: number; name: string };
export type Credit = {
    tmdbPersonId: number;
    name: string;
    // creator e writer alimentam só o grafo de gosto (taste-graph-data D1)
    role: "director" | "cast" | "creator" | "writer";
    order: number;
};

export const SERIES_TYPES = [
    "miniseries",
    "scripted",
    "documentary",
    "reality",
    "talk_show",
    "news",
    "video",
] as const;
export type SeriesType = (typeof SERIES_TYPES)[number];

// Uma recomendação do TMDB, na ordem dele (posição 1 = a primeira).
export type TmdbRecommendation = { tmdbId: number; type: TitleType };

export type TitleDetails = {
    tmdbId: number;
    type: TitleType;
    displayTitle: string;
    originalTitle: string;
    tagline: string | null;
    synopsis: string | null;
    posterImagePath: string | null;
    backdrop: { path: string; width: number } | null;
    trailerYoutubeKey: string | null;
    trailerLanguageCode: string | null;
    releaseYear: number | null;
    runtimeMinutes: number | null;
    rating: number;
    voteCount: number;
    certification: BrCertification | null;
    certificationSource: CertificationSource;
    genres: Tag[];
    keywords: Tag[];
    credits: Credit[];
    // grafo de gosto (docs/design/taste-graph.md §3)
    seriesType: SeriesType | null;
    collectionTmdbId: number | null;
    companies: Tag[];
    recommendations: TmdbRecommendation[];
};

export type CatalogTitle = TitleDetails & { slug: string };

// "gone": o TMDB respondeu 404 entre a listagem e os detalhes.
export type DetailsResult = { status: "ok"; title: TitleDetails } | { status: "rejected" | "gone" };

export interface CatalogSource {
    readonly requestCount: number;
    // tmdb_ids de um tipo disponíveis por assinatura num streaming (BR). Falha se a listagem não
    // couber inteira (B3).
    discover(type: TitleType, streamingTmdbId: number): Promise<number[]>;
    // null: a janela tem mais páginas do que o TMDB serve (500); o chamador faz carga completa.
    changedIds(type: TitleType, from: Date, to: Date): Promise<Set<number> | null>;
    details(type: TitleType, tmdbId: number): Promise<DetailsResult>;
}

export type ExistingTitle = {
    id: number;
    tmdbId: number;
    type: TitleType;
    slug: string;
    isActive: boolean;
    isBlocked: boolean;
    isRecommendable: boolean;
    // algum evento de uso ou indicação do dia aponta para ele (B6)
    referenced: boolean;
    hasSynopsis: boolean;
    hasBackdrop: boolean;
    voteCount: number;
    certification: BrCertification | null;
};

export type FinalizePlan = {
    availabilityToAdd: { titleId: number; streamingTmdbId: number }[];
    availabilityToRemove: { titleId: number; streamingTmdbId: number }[];
    reactivateIds: number[];
    inactivateIds: number[];
    deleteIds: number[];
    recommendableIds: number[];
    notRecommendableIds: number[];
};

export interface CatalogRepository {
    existingTitles(): Promise<ExistingTitle[]>;
    availability(): Promise<{ titleId: number; streamingTmdbId: number }[]>;
    // Uma transação por lote (B4). Devolve só o que mudou de fato.
    saveBatch(
        titles: CatalogTitle[],
        syncedAt: Date,
    ): Promise<{ inserted: string[]; updated: string[] }>;
    // Remoções, disponibilidade e recomendabilidade numa transação só, no fim (B11).
    finalize(plan: FinalizePlan): Promise<void>;
}

export type SyncCounts = {
    fetched: number;
    inserted: number;
    updated: number;
    inactivated: number;
    deleted: number;
    rejected: number;
    recommendable: number;
    total: number;
    active: number;
};

export type SyncResult = {
    status: "ok" | "aborted";
    abortReason: string | null;
    counts: SyncCounts;
    // Slugs cujas páginas precisam sair do cache (C4).
    changedSlugs: string[];
};

export type ChangesWindow = { start: Date | null; end: Date };

const BATCH = 200;
const DAY_MS = 86_400_000;
// O /changes do TMDB aceita no máximo 14 dias; janela maior vira carga completa.
const MAX_CHANGES_WINDOW_MS = 14 * DAY_MS;

const key = (type: TitleType, tmdbId: number) => `${type}:${tmdbId}`;

// O título gravado tem sinopse, imagem larga, classificação ou nome, e o novo não (B2).
const degrades = (stored: ExistingTitle, d: TitleDetails) =>
    (stored.hasSynopsis && !d.synopsis) ||
    (stored.hasBackdrop && !d.backdrop) ||
    (stored.certification !== null && d.certification === null) ||
    !d.displayTitle.trim();

// Cada janela começa um dia antes do fim da última carga boa (B12). Sem carga anterior, null:
// todos os detalhes são buscados.
export function changesWindow(lastOkWindowEnd: Date | null, now: Date): ChangesWindow {
    return { start: lastOkWindowEnd && new Date(lastOkWindowEnd.getTime() - DAY_MS), end: now };
}

export async function syncCatalog(
    source: CatalogSource,
    repository: CatalogRepository,
    window: ChangesWindow,
    log: (line: string) => void = () => {},
): Promise<SyncResult> {
    const startedAt = new Date();
    const counts: SyncCounts = {
        fetched: 0,
        inserted: 0,
        updated: 0,
        inactivated: 0,
        deleted: 0,
        rejected: 0,
        recommendable: 0,
        total: 0,
        active: 0,
    };
    const changedSlugs = new Set<string>();
    const abort = (abortReason: string): SyncResult => ({
        status: "aborted",
        abortReason,
        counts,
        changedSlugs: [...changedSlugs],
    });

    // 1. Disponibilidade completa, todo dia (B12).
    const available = new Map<string, { type: TitleType; tmdbId: number; streams: number[] }>();
    for (const type of ["movie", "series"] as const) {
        for (const s of STREAMING_SERVICES) {
            for (const tmdbId of await source.discover(type, s.tmdbId)) {
                const entry = available.get(key(type, tmdbId)) ?? { type, tmdbId, streams: [] };
                entry.streams.push(s.tmdbId);
                available.set(key(type, tmdbId), entry);
            }
        }
    }
    log(`Listagem: ${available.size} títulos`);

    // 2. Quem precisa de detalhes: novos e alterados no TMDB dentro da janela.
    let fullRefresh =
        !window.start || window.end.getTime() - window.start.getTime() > MAX_CHANGES_WINDOW_MS;
    const changed = new Map<TitleType, Set<number>>();
    for (const type of ["movie", "series"] as const) {
        if (fullRefresh) break;
        const ids = await source.changedIds(type, window.start!, window.end);
        if (ids) changed.set(type, ids);
        else fullRefresh = true; // janela grande demais para o limite de páginas do TMDB
    }
    const before = new Map(
        (await repository.existingTitles()).map((t) => [key(t.type, t.tmdbId), t]),
    );
    const toFetch = [...available.values()]
        .filter(
            (e) =>
                fullRefresh ||
                !before.has(key(e.type, e.tmdbId)) ||
                changed.get(e.type)!.has(e.tmdbId),
        )
        // Filmes antes de séries, para a série levar o "-serie" numa colisão.
        .sort((a, b) => (a.type === b.type ? a.tmdbId - b.tmdbId : a.type === "movie" ? -1 : 1));
    log(`Detalhes a buscar: ${toFetch.length}${fullRefresh ? " (carga completa)" : ""}`);

    // 3. Detalhes em lotes; cada lote é gravado na hora, então uma carga interrompida retoma de
    // onde parou: o que já foi gravado deixa de ser "novo" (B4).
    const taken = new Set([...before.values()].map((t) => t.slug));
    const rejected = new Set<string>();
    for (let i = 0; i < toFetch.length; i += BATCH) {
        const batch = toFetch.slice(i, i + BATCH);
        const results = await Promise.all(batch.map((e) => source.details(e.type, e.tmdbId)));
        counts.fetched += batch.length;
        const titles: CatalogTitle[] = [];
        results.forEach((r, j) => {
            if (r.status !== "ok") {
                rejected.add(key(batch[j].type, batch[j].tmdbId));
                return;
            }
            const d = r.title;
            // Campo que tinha valor e voltou vazio: o TMDB degradou o dado. Mantém o gravado e
            // conta como recusa para o limite de 2% (B2).
            const stored = before.get(key(d.type, d.tmdbId));
            if (stored && degrades(stored, d)) {
                rejected.add(key(d.type, d.tmdbId));
                return;
            }
            // Slug fixo na criação (B9): quem já existe mantém o seu.
            const slug =
                before.get(key(d.type, d.tmdbId))?.slug ??
                uniqueSlug(baseSlug(d.displayTitle, d.releaseYear), d.type, d.tmdbId, taken);
            taken.add(slug);
            titles.push({ ...d, slug });
        });
        counts.rejected = rejected.size;
        // Cedo demais a proporção engana; a partir de 1.000 respostas já dá para abortar (B2).
        if (counts.fetched >= 1000 && exceedsRejectThreshold(counts.fetched, counts.rejected)) {
            return abort(`recusas acima de 2% (${counts.rejected}/${counts.fetched})`);
        }
        const saved = await repository.saveBatch(titles, startedAt);
        counts.inserted += saved.inserted.length;
        counts.updated += saved.updated.length;
        for (const slug of [...saved.inserted, ...saved.updated]) changedSlugs.add(slug);
        log(`  ${Math.min(i + BATCH, toFetch.length)}/${toFetch.length}`);
    }
    if (exceedsRejectThreshold(counts.fetched, counts.rejected)) {
        return abort(`recusas acima de 2% (${counts.rejected}/${counts.fetched})`);
    }

    // 4. Só agora, com todas as buscas concluídas, remoções e recomendabilidade (B11).
    const titles = await repository.existingTitles();
    // Título recusado fica intocado: nem some, nem muda de disponibilidade (B2).
    const touchable = titles.filter((t) => !rejected.has(key(t.type, t.tmdbId)));
    const missing = touchable.filter((t) => t.isActive && !available.has(key(t.type, t.tmdbId)));
    const activeCount = titles.filter((t) => t.isActive).length;
    if (exceedsSafetyValve(activeCount, missing.length)) {
        return abort(`válvula: ${missing.length} de ${activeCount} títulos ativos sairiam`);
    }

    const current = await repository.availability();
    const pair = (titleId: number, streamingTmdbId: number) => `${titleId}:${streamingTmdbId}`;
    const currentSet = new Set(current.map((a) => pair(a.titleId, a.streamingTmdbId)));
    const desired = touchable.flatMap((t) =>
        (available.get(key(t.type, t.tmdbId))?.streams ?? []).map((s) => ({
            titleId: t.id,
            streamingTmdbId: s,
        })),
    );
    const desiredSet = new Set(desired.map((a) => pair(a.titleId, a.streamingTmdbId)));
    const touchableIds = new Set(touchable.map((t) => t.id));
    const availabilityToRemove = current.filter(
        (a) => touchableIds.has(a.titleId) && !desiredSet.has(pair(a.titleId, a.streamingTmdbId)),
    );
    if (exceedsSafetyValve(current.length, availabilityToRemove.length)) {
        return abort(
            `válvula: ${availabilityToRemove.length} de ${current.length} disponibilidades sairiam`,
        );
    }

    const { deleteIds, inactivateIds } = planRemovals(missing);
    const deleted = new Set(deleteIds);
    const reactivateIds = touchable
        .filter((t) => !t.isActive && available.has(key(t.type, t.tmdbId)))
        .map((t) => t.id);
    const activeAfter = (t: ExistingTitle) =>
        inactivateIds.includes(t.id) ? false : reactivateIds.includes(t.id) ? true : t.isActive;

    const remaining = titles.filter((t) => !deleted.has(t.id));
    const recommendable = remaining.map((t) => ({
        t,
        on: isRecommendable({ ...t, isActive: activeAfter(t) }),
    }));
    const plan: FinalizePlan = {
        availabilityToAdd: desired.filter(
            (a) => !currentSet.has(pair(a.titleId, a.streamingTmdbId)),
        ),
        availabilityToRemove,
        reactivateIds,
        inactivateIds,
        deleteIds,
        recommendableIds: recommendable
            .filter((r) => r.on && !r.t.isRecommendable)
            .map((r) => r.t.id),
        notRecommendableIds: recommendable
            .filter((r) => !r.on && r.t.isRecommendable)
            .map((r) => r.t.id),
    };
    // B1 também vale para quem deixa de ser recomendável (conteúdo que sumiu em massa).
    const recommendableNow = remaining.filter((t) => t.isRecommendable).length;
    if (exceedsSafetyValve(recommendableNow, plan.notRecommendableIds.length)) {
        return abort(
            `válvula: ${plan.notRecommendableIds.length} de ${recommendableNow} recomendáveis deixariam de ser`,
        );
    }
    await repository.finalize(plan);

    const byId = new Map(titles.map((t) => [t.id, t]));
    for (const id of [
        ...reactivateIds,
        ...inactivateIds,
        ...deleteIds,
        ...plan.recommendableIds,
        ...plan.notRecommendableIds,
    ]) {
        changedSlugs.add(byId.get(id)!.slug);
    }
    // Bloqueio é manual; a carga diária garante que a página bloqueada saia do cache (C5).
    for (const t of remaining) if (t.isBlocked) changedSlugs.add(t.slug);

    counts.inactivated = inactivateIds.length;
    counts.deleted = deleteIds.length;
    counts.total = remaining.length;
    counts.active = remaining.filter(activeAfter).length;
    counts.recommendable = recommendable.filter((r) => r.on).length;
    return { status: "ok", abortReason: null, counts, changedSlugs: [...changedSlugs] };
}
