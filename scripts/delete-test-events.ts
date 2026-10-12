// Apaga os eventos do teste (RNF10) entre dois dias de Brasília, inclusive. Sem --confirm, só conta.
// Uso: npm run events:delete -- --from 2026-10-26 --to 2026-11-01 [--confirm]
import {
    DELETE_EVENTS_USAGE,
    deleteTestEvents,
    parseDeleteEventsArgs,
    type DeleteEventsArgs,
} from "@/application/delete-test-events";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleUsageEventsRepository } from "@/infrastructure/db/usage-events-repository";
import { dbEnvErrors } from "@/infrastructure/sync-env";
import { publicErrorMessage } from "@/infrastructure/tmdb/client";

async function main() {
    let args: DeleteEventsArgs;
    try {
        args = parseDeleteEventsArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`${(error as Error).message}\n${DELETE_EVENTS_USAGE}`);
        process.exit(1);
    }
    const envErrors = dbEnvErrors(process.env);
    if (envErrors.length) {
        for (const e of envErrors) console.error(`Variável de ambiente errada: ${e}`);
        process.exit(1);
    }

    const { range, matched, deleted } = await deleteTestEvents(
        args,
        new DrizzleUsageEventsRepository(createDb()),
    );
    console.log(
        `anonymous_usage_events de ${args.from} a ${args.to} (Brasília)` +
            ` = [${range.start.toISOString()}, ${range.end.toISOString()})`,
    );
    console.log(`Encontrados: ${matched}`);
    if (args.confirm) console.log(`Apagados: ${deleted}`);
    else console.log("Ensaio: nada foi apagado. Para apagar, rode de novo com --confirm.");
}

main().catch((e) => {
    // nada do erro vai para o terminal: pode trazer host ou URL do banco (security §6)
    console.error(publicErrorMessage(e, "Erro ao apagar os eventos"));
    process.exit(1);
});
