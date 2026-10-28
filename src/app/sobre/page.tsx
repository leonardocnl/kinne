import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/domain/contact";
import { PIX } from "@/domain/pix";
import { PageFrame } from "../_components/account/PageFrame";
import { PixCopy } from "./PixCopy";

export const metadata: Metadata = {
    title: "Sobre · Kinne",
    description: "Por que o Kinne existe, quem o faz e os créditos.",
};

const body = "text-body text-soft text-pretty";
const link = "underline decoration-line underline-offset-5 hover:decoration-paper";

function External({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
            {children}
        </a>
    );
}

/** Uma seção: no computador, o número e o nome numa coluna estreita e o texto ao lado. */
function Chapter({
    number,
    title,
    id,
    children,
}: {
    number: string;
    title: string;
    id?: string;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={`${id ?? number}-title`}
            className="grid scroll-mt-5 gap-4 border-t border-line pt-6 desktop:grid-cols-12 desktop:gap-x-10"
        >
            <h2
                id={`${id ?? number}-title`}
                className="flex items-baseline gap-3 desktop:col-span-3 desktop:flex-col desktop:gap-1"
            >
                <span className="text-caption text-faint tabular-nums">{number}</span>
                <span className="font-display text-reel font-medium">{title}</span>
            </h2>
            <div className="flex max-w-measure flex-col gap-4 desktop:col-span-9">{children}</div>
        </section>
    );
}

/** Sobre: por que o Kinne existe, os créditos e, no fim, quem o faz, os contatos e o apoio. */
export default function AboutPage() {
    return (
        <PageFrame nav="sobre">
            <main className="flex flex-col gap-12 pt-4 pb-6 desktop:gap-16 desktop:pt-10">
                <header className="flex flex-col gap-6 desktop:gap-8">
                    {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático: o next/image só somaria JS */}
                    <img
                        src="/icon.svg"
                        alt="Kinne"
                        width={78}
                        height={48}
                        className="h-12 w-auto self-start"
                    />
                    <h1 className="max-w-measure font-display text-title font-medium text-balance">
                        Um filme ou série por vez, só entre os streamings que você assina.
                    </h1>
                </header>

                <Chapter number="01" title="Por que o Kinne existe">
                    <p className={body}>
                        Eu já assisti Breaking Bad quinze vezes. Não foi por falta de títulos: toda
                        vez que tentei começar algo novo, nada chegava à altura, e eu voltava para o
                        que já conhecia. Pior, eu gastava mais tempo com a minha namorada ou com os
                        amigos procurando o que ver do que vendo de fato.
                    </p>
                    <p className={body}>
                        O Kinne nasceu para acabar com esse atrito: uma indicação por vez, só entre
                        os streamings que você assina, a partir do que você já gosta. Para cinéfilo
                        ou não. Todo mundo tem gosto, e quase nenhum jeito de escolher o que ver foi
                        feito para quem quer descobrir algo novo. O Kinne existe para resolver isso,
                        e eu quis fazê-lo do jeito mais bonito que eu conseguisse.
                    </p>
                </Chapter>

                <Chapter number="02" title="Créditos">
                    <p className={body}>
                        This product uses the TMDB API but is not endorsed or certified by TMDB.
                    </p>
                    <p className={body}>
                        Dados de filmes e séries por{" "}
                        <External href="https://www.themoviedb.org">TMDB</External>. Dados de onde
                        assistir por <External href="https://www.justwatch.com">JustWatch</External>
                        .
                    </p>
                </Chapter>

                <Chapter number="03" title="Quem sou eu">
                    <p className={body}>
                        Sou o Leonardo, estudante de Sistemas de Informação na UFLA. Atuo com
                        segurança computacional: meu trabalho é descobrir onde os sistemas quebram.
                        Fora disso, gosto de construir coisas que eu gostaria que existissem, e o
                        Kinne é uma delas. Se ele te ajudou a achar algo para ver hoje, já valeu.
                    </p>
                    <ul className="flex flex-wrap gap-x-6 text-small font-medium">
                        <li className="flex h-target items-center">
                            <External href="https://www.linkedin.com/in/leonardocnl">
                                LinkedIn
                            </External>
                        </li>
                        <li className="flex h-target items-center">
                            <External href="https://github.com/leonardocnl">GitHub</External>
                        </li>
                        <li className="flex h-target items-center">
                            <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                                {CONTACT_EMAIL}
                            </a>
                        </li>
                    </ul>
                </Chapter>

                <Chapter number="04" title="Apoie" id="apoie">
                    <p className={body}>
                        Se o Kinne já te salvou de uma noite inteira rolando catálogo, que tal me
                        pagar um café? Ajuda a manter tudo no ar e a deixar as indicações cada vez
                        melhores. Só se você quiser: qualquer valor, pelo Pix, sem conta e sem taxa.
                    </p>
                    <div className="flex flex-col gap-5 desktop:flex-row desktop:items-start">
                        {/* SVG fixo gerado do BR Code (scripts/generate-pix-qr.py); sem next/image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/pix-qr.svg"
                            alt={`QR code Pix de ${PIX.name}`}
                            width={176}
                            height={176}
                            className="size-44 shrink-0"
                        />
                        <div className="flex flex-col gap-3">
                            <p className="text-data text-faint">
                                Chave Pix (aleatória) de {PIX.name}, {PIX.city}
                            </p>
                            <p className="text-small break-all text-paper select-all">{PIX.key}</p>
                            <PixCopy />
                        </div>
                    </div>
                </Chapter>
            </main>
        </PageFrame>
    );
}
