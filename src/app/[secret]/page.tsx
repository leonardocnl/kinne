import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "../_components/Shell";
import { TopBar } from "../_components/TopBar";
import { TeamMark } from "./TeamMark";

// US006: o endereço secreto vem de TEAM_SECRET_PATH (RNE001), com ou sem a barra. Qualquer outro
// endereço de um nível só cai aqui e segue para a página de não encontrado.
// O params vem antes do segredo: sem ele, o build (sem a variável) gravaria o 404 na página.
async function isTeamPath(params: Promise<{ secret: string }>) {
    const path = decodeURIComponent((await params).secret);
    const secret = process.env.TEAM_SECRET_PATH?.replace(/^\/+|\/+$/g, "");
    return Boolean(secret) && path === secret;
}

// a checagem também aqui, para o endereço errado responder 404 antes do conteúdo
export async function generateMetadata({ params }: PageProps<"/[secret]">): Promise<Metadata> {
    if (!(await isTeamPath(params))) notFound();
    return { title: "Equipe · Kinne", robots: { index: false, follow: false } };
}

export default function TeamPage(props: PageProps<"/[secret]">) {
    return (
        <Shell>
            <TopBar back />
            <Suspense>
                <Team {...props} />
            </Suspense>
        </Shell>
    );
}

async function Team({ params }: PageProps<"/[secret]">) {
    if (!(await isTeamPath(params))) notFound();
    return <TeamMark />;
}
