import { connection } from "next/server";
import { Suspense } from "react";
import { brasiliaDay, longDate } from "@/domain/day";
import { DailyPicks } from "./_components/home/DailyPicks";
import { HomeErrorBoundary } from "./_components/home/HomeError";
import { HomeSkeleton } from "./_components/home/HomeSkeleton";
import { TopBar } from "./_components/home/TopBar";
import { homePicks } from "./_data/home";

export default function Home() {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col gap-3.5 px-gutter pt-5.5 pb-7 max-desktop:gap-3">
            <HomeErrorBoundary>
                <Suspense fallback={<HomeSkeleton />}>
                    <Today />
                </Suspense>
            </HomeErrorBoundary>
            <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-1.5 border-t border-line pt-4 text-footnote text-faint max-desktop:mt-7 max-desktop:flex-col">
                <p>
                    Dados de filmes e séries: <b className="font-medium text-soft">TMDB</b> · Onde
                    assistir: <b className="font-medium text-soft">JustWatch</b>. Este produto usa a
                    API do TMDB, mas não é endossado nem certificado pelo TMDB.
                </p>
                <p>O Kinne conta visitas sem identificar quem você é.</p>
            </footer>
        </div>
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
            <DailyPicks date={date} picks={picks} />
        </>
    );
}
