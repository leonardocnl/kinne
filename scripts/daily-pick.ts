// Indicações do dia para hoje e amanhã (Brasília), para a virada da meia-noite já ter as
// indicações prontas. Uso: npm run daily:pick
import { generateDailyPicks } from "@/application/daily-picks";
import { addDays, brasiliaDay } from "@/domain/day";
import { createDb } from "@/infrastructure/db/client";
import { DrizzleDailyPicksRepository } from "@/infrastructure/db/daily-picks-repository";
import { publicErrorMessage } from "@/infrastructure/tmdb/client";

async function main() {
    const repository = new DrizzleDailyPicksRepository(createDb());
    const today = brasiliaDay(new Date());
    for (const day of [today, addDays(today, 1)]) {
        const { created, warnings } = await generateDailyPicks(day, repository);
        for (const warning of warnings) console.warn(`Aviso: ${warning}`);
        console.log(`${day}: ${created ? "indicações geradas" : "já existiam; nada mudou"}`);
        for (const p of await repository.picksOf(day)) console.log(`  ${p.genre}: ${p.title}`);
    }
}

main().catch((e) => {
    // D1: nunca ecoa a mensagem do driver do banco.
    console.error(publicErrorMessage(e));
    process.exit(1);
});
