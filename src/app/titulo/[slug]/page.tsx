import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { brasiliaDay } from "@/domain/day";
import { parseOrigin } from "../../_components/title/origin";
import { TitleSkeleton } from "../../_components/title/TitleSkeleton";
import { TitleView } from "../../_components/title/TitleView";
import { homePicks } from "../../_data/home";
import { titleScreen } from "../../_data/title";

export async function generateMetadata({ params }: PageProps<"/titulo/[slug]">): Promise<Metadata> {
    const title = await titleScreen((await params).slug);
    if (!title) notFound();
    return { title: `${title.title} · Kinne` };
}

export default function TitlePage(props: PageProps<"/titulo/[slug]">) {
    return (
        <Suspense fallback={<TitleSkeleton />}>
            <Title {...props} />
        </Suspense>
    );
}

async function Title({ params, searchParams }: PageProps<"/titulo/[slug]">) {
    const { slug } = await params;
    const origin = parseOrigin((await searchParams).origem);
    const title = await titleScreen(slug);
    if (!title) notFound();
    if (origin !== "dia") {
        return <TitleView key={slug} title={title} origin={origin} nextDailySlug={null} />;
    }

    // US004 C5: a seguinte das indicações de hoje, voltando à primeira depois da última
    await connection();
    const picks = await homePicks(brasiliaDay(new Date()));
    const index = picks.findIndex((p) => p.slug === slug);
    return (
        <TitleView
            key={slug}
            // o gênero em que o título foi indicado hoje, o mesmo da tela inicial
            title={{ ...title, genre: picks[index]?.genre ?? title.genre }}
            origin={origin}
            nextDailySlug={picks[(index + 1) % picks.length]?.slug ?? null}
        />
    );
}
