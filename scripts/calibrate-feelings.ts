// Confere o grafo de gosto contra o gabarito (docs/design/taste-graph.md §10). Só lê o banco:
// monta o grafo em memória, sem gravar nada.
// Uso: npm run feelings:calibrate            (resumo: notas do gabarito)
//      npm run feelings:calibrate -- --list  (também os 12 primeiros de cada lista)
import { meetsQualityFloor, meetsTasteFloor } from "@/domain/catalog";
import { FEELING_LABELS, FEELINGS, rankByFeeling, resolveRecipe } from "@/domain/feelings";
import { weightedRating } from "@/domain/rounds";
import {
    evaluateGolden,
    FEELING_GOLDEN,
    normalizeTitleName,
    TASTE_GOLDEN,
    type GoldenResult,
    type TitleRef,
} from "@/domain/taste-golden";
import {
    buildNeighborEdges,
    rankByTaste,
    spreadTaste,
    strongestPath,
    toNeighborGraph,
} from "@/domain/taste-graph";
import { connectSyncDb } from "@/infrastructure/db/catalog-repository";
import { DrizzleTasteGraphRepository } from "@/infrastructure/db/taste-graph-repository";
import { publicErrorMessage } from "@/infrastructure/tmdb/client";

const SHOW = 12;
const showLists = process.argv.includes("--list");

function report(
    label: string,
    result: GoldenResult,
    ranked: number[],
    nameOf: (id: number) => string,
    why?: (id: number) => string,
) {
    const score = `${result.found}/${result.expected}`;
    const violations = result.violations.length;
    console.log(`## ${label} — esperados ${score}, violações ${violations}`);
    if (result.missed.length) console.log(`   fora dos 30: ${result.missed.join("; ")}`);
    if (violations) console.log(`   VIOLAÇÕES: ${result.violations.join("; ")}`);
    if (result.absent.length) {
        // abaixo do piso: o título existe, mas nunca é indicado (RNG001), então não conta
        console.log(`   ausentes ou abaixo do piso: ${result.absent.join("; ")}`);
    }
    if (showLists) {
        ranked.slice(0, SHOW).forEach((id, i) => {
            const reason = why ? `  ← ${why(id)}` : "";
            console.log(`   ${String(i + 1).padStart(2)}. ${nameOf(id)}${reason}`);
        });
    }
    console.log("");
}

async function main() {
    const url = process.env.DATABASE_URL_POOLED;
    if (!url) throw new Error("DATABASE_URL_POOLED não definida");
    const { db, close } = await connectSyncDb(url);
    try {
        const t0 = performance.now();
        const { rows, themeIdsByName } = await new DrizzleTasteGraphRepository(db).load();
        const t1 = performance.now();
        const edges = buildNeighborEdges(rows.map((r) => r.profile));
        const graph = toNeighborGraph(edges);
        const edgeOf = new Map(edges.map((e) => [`${e.a}:${e.b}`, e]));
        const t2 = performance.now();

        const eligible = rows.filter((r) => meetsQualityFloor(r.rating, r.votes));
        const mean = eligible.reduce((s, r) => s + r.rating, 0) / Math.max(eligible.length, 1);
        const quality = (r: (typeof rows)[number]) => weightedRating(r.rating, r.votes, mean);
        const byId = new Map(rows.map((r) => [r.profile.id, r]));
        const nameOf = (id: number) => {
            const r = byId.get(id)!;
            return `${r.name} (${r.year ?? "?"}, ${r.profile.type === "movie" ? "filme" : "série"})`;
        };

        const byName = new Map<string, { id: number; year: number | null }[]>();
        for (const r of rows) {
            const key = normalizeTitleName(r.name);
            byName.set(key, [...(byName.get(key) ?? []), { id: r.profile.id, year: r.year }]);
        }
        // ano com folga de 1: o TMDB às vezes data pela estreia em outro país
        const resolve = (ref: TitleRef) =>
            byName
                .get(normalizeTitleName(ref.name))
                ?.find((c) => c.year !== null && Math.abs(c.year - ref.year) <= 1)?.id;
        // o gabarito só conta títulos que podem ser indicados; os sinais aceitam qualquer um
        const eligibleIds = new Set(eligible.map((r) => r.profile.id));
        const resolveEligible = (ref: TitleRef) => {
            const id = resolve(ref);
            return id !== undefined && eligibleIds.has(id) ? id : undefined;
        };

        const withNeighbors = graph.size;
        console.log(
            `Grafo: ${rows.length} títulos, ${withNeighbors} com vizinhos, ${edges.length} arestas. ` +
                `Carga ${Math.round(t1 - t0)} ms, grafo ${Math.round(t2 - t1)} ms.\n`,
        );

        // raridade de tema em ids do TMDB, para as receitas
        const themeCount = new Map<number, number>();
        for (const r of rows) {
            for (const id of new Set(r.themeTmdbIds)) {
                themeCount.set(id, (themeCount.get(id) ?? 0) + 1);
            }
        }
        const themeRarity = (id: number) =>
            Math.log(rows.length / (themeCount.get(id) ?? rows.length));

        let totalFound = 0;
        let totalExpected = 0;
        let totalViolations = 0;
        const tally = (r: GoldenResult) => {
            totalFound += r.found;
            totalExpected += r.expected;
            totalViolations += r.violations.length;
        };

        console.log("# Sentimentos\n");
        const candidates = eligible.map((r) => ({
            id: r.profile.id,
            genreTmdbIds: r.genreTmdbIds,
            themeTmdbIds: r.themeTmdbIds,
            certification: r.certification,
            quality: quality(r),
        }));
        for (const feeling of FEELINGS) {
            const recipe = resolveRecipe(feeling, (name) => themeIdsByName.get(name.toLowerCase()));
            const ranked = rankByFeeling(feeling, recipe, candidates, themeRarity);
            const result = evaluateGolden(ranked, FEELING_GOLDEN[feeling], resolveEligible);
            tally(result);
            report(`${FEELING_LABELS[feeling]} (${ranked.length} títulos)`, result, ranked, nameOf);
        }

        console.log("# Gosto\n");
        for (const golden of TASTE_GOLDEN) {
            const signals = golden.signals.flatMap((s) => {
                const titleId = resolve(s.title);
                return titleId === undefined ? [] : [{ titleId, signal: s.signal }];
            });
            const scores = spreadTaste(graph, signals);
            // §8: o que o gosto alcança dispensa a nota mínima e precisa de 100 votos; o resto,
            // do piso de sempre
            const pool = rows.filter((r) =>
                (scores.get(r.profile.id) ?? 0) > 0
                    ? meetsTasteFloor(r.votes)
                    : meetsQualityFloor(r.rating, r.votes),
            );
            const poolIds = new Set(pool.map((r) => r.profile.id));
            const tasteCandidates = pool.map((r) => ({ id: r.profile.id, quality: quality(r) }));
            const ranked = (rankByTaste(scores, tasteCandidates) ?? []).filter(
                (id) => !signals.some((s) => s.titleId === id),
            );
            const resolveInPool = (ref: TitleRef) => {
                const id = resolve(ref);
                return id !== undefined && poolIds.has(id) ? id : undefined;
            };
            const result = evaluateGolden(ranked, golden, resolveInPool);
            tally(result);
            // o caminho mais forte até cada indicação, para achar a aresta que trouxe um intruso
            const liked = signals.filter((x) => x.signal === "liked").map((x) => x.titleId);
            const why = (id: number) => {
                const path = strongestPath(graph, liked, id);
                if (!path) return "só pelos sinais negativos ou pela nota";
                return path.ids
                    .slice(0, -1)
                    .map((from, i) => {
                        const to = path.ids[i + 1];
                        const edge = edgeOf.get(from < to ? `${from}:${to}` : `${to}:${from}`)!;
                        const c = edge.content.toFixed(2);
                        const r = edge.recommendation.toFixed(2);
                        return `${byId.get(from)!.name} [obra ${c}, TMDB ${r}]`;
                    })
                    .join(" → ");
            };
            report(golden.label, result, ranked, nameOf, why);
        }

        console.log(
            `TOTAL: esperados ${totalFound}/${totalExpected}, violações ${totalViolations}`,
        );
    } finally {
        await close();
    }
}

main().catch((e) => {
    // D1: nunca ecoa a mensagem do driver do banco.
    console.error(publicErrorMessage(e));
    process.exit(1);
});
