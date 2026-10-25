import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/domain/contact";
import { PIX } from "@/domain/pix";
import { PageFrame } from "../_components/account/PageFrame";
import { SHOW_SIGN_IN } from "../_components/account/signIn";
import { Navbar } from "../_components/ui/Navbar";
import { PixCopy } from "./PixCopy";

export const metadata: Metadata = {
    title: "Sobre · Kinne",
    description: "Por que o Kinne existe, o que ele guarda de você e quem o faz.",
};

const heading = "font-display text-heading font-medium";
const body = "text-body text-soft text-pretty";
const link = "underline decoration-line underline-offset-5 hover:decoration-paper";

function External({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
            {children}
        </a>
    );
}

// RASCUNHO para o dono revisar: respostas derivadas dos requisitos (docs/requisitos).
const FAQ: { question: string; answer: ReactNode }[] = [
    {
        question: "De onde vêm os dados?",
        answer: (
            <>
                Filmes, séries, sinopses, notas e imagens vêm do TMDB. Onde assistir vem do
                JustWatch, via TMDB. O catálogo se atualiza uma vez por dia.
            </>
        ),
    },
    {
        question: "Por que não achei um título?",
        answer: (
            <>
                O Kinne só conhece o que está nos streamings participantes, no Brasil, para quem já
                os assina. Aluguel e compra não entram. A busca alcança todo esse catálogo, mas as
                indicações do dia, os filtros e o “Me surpreenda” usam só os títulos com nota de 6,4
                ou mais, pelo menos 500 votos no TMDB, sinopse em português e classificação
                indicativa conhecida.
            </>
        ),
    },
    {
        question: "Por que só alguns streamings?",
        answer: (
            <>
                Por enquanto são cinco: Netflix, Max, Prime Video, Disney+ e Globoplay. Valem só os
                títulos incluídos na mensalidade, no Brasil.
            </>
        ),
    },
    {
        question: "Por que um título que já vi apareceu?",
        answer: (
            <>
                Quem você marca como “Já vi” deixa de aparecer nos filtros e no “Me surpreenda”,
                naquele navegador. A indicação do dia é igual para todo mundo e pode repeti-lo. Se
                você limpar os dados do navegador, as marcações se perdem.
            </>
        ),
    },
    {
        question: "O que o Kinne guarda de mim?",
        answer: (
            <>
                Pouco, e sem o seu nome. O resumo está em “Seus dados e privacidade”, acima, e o
                texto completo em{" "}
                <Link href="/privacidade" className={link}>
                    Privacidade
                </Link>
                .
            </>
        ),
    },
    {
        question: "O Kinne é pago?",
        answer: (
            <>Não. Usar é de graça e não há anúncios. Quem quiser pode apoiar, sem obrigação.</>
        ),
    },
    {
        question: "Posso sugerir algo?",
        answer: (
            <>
                Pode, e eu gosto de ouvir. Escreva para{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
                    {CONTACT_EMAIL}
                </a>
                .
            </>
        ),
    },
];

export default function AboutPage() {
    return (
        <PageFrame>
            <main className="flex max-w-measure flex-col gap-5 pt-2 desktop:pt-3.5">
                <h1 className="pb-1 font-display text-title font-medium text-balance">Sobre</h1>

                <h2 className={heading}>Por que o Kinne existe</h2>
                <p className={body}>
                    Eu já assisti Breaking Bad quinze vezes. Não foi por falta de títulos: toda vez
                    que tentei começar algo novo, nada chegava à altura, e eu voltava para o que já
                    conhecia. Pior, eu gastava mais tempo com a minha namorada ou com os amigos
                    procurando o que ver do que vendo de fato. O Kinne nasceu para acabar com esse
                    atrito: uma indicação por vez, só entre os streamings que você assina, a partir
                    do que você já gosta. Para cinéfilo ou não. Todo mundo tem gosto, e quase nenhum
                    jeito de escolher o que ver foi feito para quem quer descobrir algo novo. O
                    Kinne existe para resolver isso, e eu quis fazê-lo do jeito mais bonito que eu
                    conseguisse.
                </p>

                <h2 className={heading}>Seus dados e privacidade</h2>
                <p className="text-data text-faint">
                    Resumo do que o Kinne faz hoje. Rascunho, em revisão pelo responsável.
                </p>
                <ul className={`${body} flex list-disc flex-col gap-2 pl-5`}>
                    <li>
                        O que você marca (streamings, gosto e “Já vi”) fica no seu navegador. Sem
                        conta, não vai para lugar nenhum.
                    </li>
                    <li>
                        O Kinne conta o uso por eventos anônimos (abrir o app, ver uma indicação,
                        “Vou assistir”, “Já vi”), ligados só a um código aleatório do seu navegador.
                        Não guardamos nome, e-mail nem IP com eles.
                    </li>
                    {SHOW_SIGN_IN && (
                        <li>
                            Se você entrar com e-mail, guardamos o e-mail, seus streamings, seu
                            gosto e seus “Já vi”. Em “Seu perfil” você baixa tudo ou apaga a conta.
                        </li>
                    )}
                    <li>Sem anúncios, e seus dados não são vendidos nem usados para propaganda.</li>
                </ul>
                <p className={body}>
                    O texto completo está em{" "}
                    <Link href="/privacidade" className={link}>
                        Privacidade
                    </Link>
                    .
                </p>

                <h2 className={heading}>Perguntas frequentes</h2>
                <p className="text-data text-faint">Rascunho, em revisão pelo responsável.</p>
                <div className="flex flex-col border-t border-line">
                    {FAQ.map(({ question, answer }) => (
                        <details key={question} className="border-b border-line py-2.5">
                            <summary className="min-h-target cursor-pointer py-2 text-body font-medium">
                                {question}
                            </summary>
                            <p className={`${body} pt-1 pb-2`}>{answer}</p>
                        </details>
                    ))}
                </div>

                <h2 className={heading}>Quem sou eu</h2>
                <p className={body}>
                    Sou o Leonardo, estudante de Sistemas de Informação na UFLA. Atuo com segurança
                    computacional: meu trabalho é descobrir onde os sistemas quebram. Fora disso,
                    gosto de construir coisas que eu gostaria que existissem, e o Kinne é uma delas.
                    Se ele te ajudou a achar algo para ver hoje, já valeu.
                </p>
                <ul className="flex flex-wrap gap-x-6 text-small font-medium">
                    <li className="flex h-target items-center">
                        <External href="https://www.linkedin.com/in/leonardocnl">LinkedIn</External>
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

                <h2 id="apoie" className={`${heading} scroll-mt-5`}>
                    Apoie
                </h2>
                <p className={body}>
                    Gostou? Pague um café. Apoio voluntário, sem conta e sem taxa.
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

                <h2 className={heading}>Créditos</h2>
                <p className={body}>
                    This product uses the TMDB API but is not endorsed or certified by TMDB.
                </p>
                <p className={body}>
                    Dados de filmes e séries por{" "}
                    <External href="https://www.themoviedb.org">TMDB</External>. Dados de onde
                    assistir por <External href="https://www.justwatch.com">JustWatch</External>.
                </p>
            </main>
            <Navbar current="sobre" />
        </PageFrame>
    );
}
