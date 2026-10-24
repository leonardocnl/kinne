// Carga completa do catálogo a partir do TMDB (threat model docs/threats/catalog-sync.md).
// Uso: SYNC_TARGET=develop npm run catalog:sync
// Logs só com contagens e ids (D1, D2); o resumo do GitHub também (D7).
import { appendFileSync } from "node:fs";
import { changesWindow, syncCatalog, type SyncResult } from "@/application/sync-catalog";
import { connectSyncDb, DrizzleCatalogRepository } from "@/infrastructure/db/catalog-repository";
import { requestRevalidation } from "@/infrastructure/revalidation";
import { syncEnvErrors } from "@/infrastructure/sync-env";
import { TmdbCatalogSource } from "@/infrastructure/tmdb/catalog-source";
import { publicErrorMessage, TmdbClient } from "@/infrastructure/tmdb/client";

const NEON_FREE_BYTES = 512 * 1024 * 1024;
const SIZE_WARNING_RATIO = 0.7; // C2

function summary(lines: string[]) {
    for (const l of lines) console.log(l);
    const file = process.env.GITHUB_STEP_SUMMARY;
    if (file) appendFileSync(file, lines.join("\n") + "\n");
}

async function main() {
    const envErrors = syncEnvErrors(process.env);
    if (envErrors.length) {
        for (const e of envErrors) console.error(`Variável de ambiente errada: ${e}`);
        process.exit(1);
    }
    const target = process.env.SYNC_TARGET!;
    const { db, close } = await connectSyncDb(process.env.SYNC_DATABASE_URL!);
    const repository = new DrizzleCatalogRepository(db);
    let exitCode = 0;
    try {
        // C3: o banco diz qual ambiente é; divergência aborta antes de qualquer escrita.
        const environment = await repository.environment();
        if (environment !== target) {
            console.error(`Banco é "${environment ?? "sem meta.environment"}", alvo é "${target}"`);
            process.exit(1);
        }

        const startedAt = new Date();
        const runId = await repository.startRun(target, startedAt);
        // B8: outra carga em andamento; esta sai limpa e fica registrada.
        if (!(await repository.tryLock())) {
            await repository.finishRun(runId, { status: "skipped" });
            summary(["## Carga do catálogo", "", "Outra carga em andamento: pulada."]);
            return;
        }

        // SYNC_FULL=1 força a carga completa, ex.: depois de a carga passar a ler campos novos
        // (taste-graph-data, escopo 4).
        const full = process.env.SYNC_FULL === "1";
        const window = changesWindow(full ? null : await repository.lastOkWindowEnd(), startedAt);
        const source = new TmdbCatalogSource(new TmdbClient());
        let result: SyncResult;
        try {
            result = await syncCatalog(source, repository, window, console.log);
        } catch (e) {
            await repository.finishRun(runId, { status: "failed" });
            throw e;
        }

        const size = await repository.finishRun(runId, {
            status: result.status,
            abortReason: result.abortReason,
            window: result.status === "ok" ? window : undefined,
            counts: result.counts,
        });

        // C4: só depois de gravado. Falha na invalidação não desfaz a carga, mas falha o job.
        let revalidation = "não configurada";
        const origin = process.env.REVALIDATE_ORIGIN;
        const secret = process.env.REVALIDATE_SECRET;
        if (origin && secret && result.changedSlugs.length) {
            const r = await requestRevalidation(origin, secret, result.changedSlugs);
            revalidation = `${r.sent} pedidos ok, ${r.failed} falharam`;
            if (r.failed) exitCode = 1;
        }

        // Falha na limpeza da busca não desfaz a carga, mas falha o job (E2).
        const search = await repository.cleanSearchState(runId).catch(() => {
            exitCode = 1;
            return null;
        });

        // Sessões e códigos vencidos das contas (D3): falha na purga não desfaz a carga, mas falha o job.
        const purged = await repository.purgeExpiredAuth().catch(() => {
            exitCode = 1;
            return null;
        });

        const c = result.counts;
        const sizeRatio = size / NEON_FREE_BYTES;
        summary([
            "## Carga do catálogo",
            "",
            `Alvo: ${target} · status: ${result.status}${result.abortReason ? ` (${result.abortReason})` : ""}`,
            "",
            "| Contagem | Valor |",
            "| --- | --- |",
            ...Object.entries(c).map(([k, v]) => `| ${k} | ${v} |`),
            `| páginas invalidadas | ${result.changedSlugs.length} |`,
            `| requisições ao TMDB | ${source.requestCount} |`,
            `| tamanho do banco (MB) | ${(size / 1024 / 1024).toFixed(1)} |`,
            "",
            `Invalidação do cache: ${revalidation}.`,
            "",
            ...(search
                ? [
                      `Busca: ${search.cacheRows} respostas do TMDB em cache.`,
                      "",
                      "| Dia | Contador da busca | Valor |",
                      "| --- | --- | --- |",
                      ...search.counters.map((r) => `| ${r.day} | ${r.name} | ${r.count} |`),
                  ]
                : ["**Aviso:** limpeza da busca falhou."]),
            purged === null
                ? "**Aviso:** limpeza das contas falhou."
                : `Contas: ${purged} sessões e códigos vencidos apagados.`,
            "",
            ...(sizeRatio > SIZE_WARNING_RATIO
                ? [`**Aviso:** banco em ${(sizeRatio * 100).toFixed(0)}% do limite do Neon.`]
                : []),
        ]);
        // E2: abortar sai com erro para o GitHub avisar por e-mail.
        if (result.status === "aborted") exitCode = 1;
    } finally {
        await close();
    }
    process.exit(exitCode);
}

main().catch((e) => {
    // D1: só o erro do TMDB (status e caminho) tem mensagem própria; o resto não ecoa o cliente.
    console.error(publicErrorMessage(e));
    process.exit(1);
});
