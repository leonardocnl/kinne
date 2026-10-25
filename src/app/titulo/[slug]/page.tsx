import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { brasiliaDay } from "@/domain/day";
import { TitleSkeleton } from "../../_components/title/TitleSkeleton";
import { TitleView } from "../../_components/title/TitleView";
import { homePicks } from "../../_data/home";
import { titleScreen } from "../../_data/title";

export async function generateMetadata({ params }: PageProps<"/titulo/[slug]">): Promise<Metadata> {
    const title = await titleScreen((await params).slug);
    if (!title) notFound();
    return {
        title: `${title.title} · Kinne`,
        ...(!title.recommendable && { robots: { index: false } }),
    };
}

export default function TitlePage(props: PageProps<"/titulo/[slug]">) {
    return (
        <Suspense fallback={<TitleSkeleton />}>
            <Title {...props} />
        </Suspense>
    );
}

async function Title({ params }: PageProps<"/titulo/[slug]">) {
    const { slug } = await params;
    const title = await titleScreen(slug);
    if (!title) notFound();

    // US004 C5: se o título está entre as indicações de hoje, o gênero em que foi indicado e a
    // seguinte, voltando à primeira depois da última. A tela só usa isso na origem "dia", que
    // vive no navegador (security §8).
    await connection();
    const picks = await homePicks(brasiliaDay(new Date())).catch(() => []);
    const index = picks.findIndex((p) => p.slug === slug);
    const daily =
        index < 0
            ? null
            : { genre: picks[index].genre, nextSlug: picks[(index + 1) % picks.length].slug };
    return <TitleView key={slug} title={title} daily={daily} />;
}
