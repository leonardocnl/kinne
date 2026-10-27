import { connection } from "next/server";
import { Suspense } from "react";
import { brasiliaDay, longDate } from "@/domain/day";
import { AppOpened } from "./_components/AppOpened";
import { DailyPicks } from "./_components/home/DailyPicks";
import { HomeErrorBoundary } from "./_components/home/HomeError";
import { HomeSkeleton } from "./_components/home/HomeSkeleton";
import { Availability } from "./_components/ui/Availability";
import { Shell } from "./_components/Shell";
import { TopBar } from "./_components/TopBar";
import { homePicks } from "./_data/home";

export default function Home() {
    return (
        <Shell nav="inicio">
            <AppOpened />
            <HomeErrorBoundary topBar={<TopBar />}>
                <Suspense fallback={<HomeSkeleton />}>
                    <Today />
                </Suspense>
            </HomeErrorBoundary>
        </Shell>
    );
}

// O dia vem da hora da visita, em Brasília; as indicações do dia vêm da cópia diária.
async function Today() {
    await connection();
    const day = brasiliaDay(new Date());
    const date = longDate(day);
    const picks = await homePicks(day);
    // um gênero sem candidato só some do dia; nenhum gênero com candidato é erro (CM002)
    if (picks.length === 0) throw new Error(`${day}: nenhuma indicação do dia`);
    return (
        <>
            <TopBar date={date} />
            <DailyPicks
                date={date}
                picks={picks}
                availability={picks.map((p) => (
                    <Availability key={p.slug} streamings={p.streamings} />
                ))}
            />
        </>
    );
}
