import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/domain/contact";
import { PageFrame } from "../_components/account/PageFrame";

export const metadata: Metadata = {
    title: "Perguntas frequentes · Kinne",
    description: "De onde vêm os dados, por que só alguns streamings e o que o Kinne guarda.",
};

const body = "text-body text-soft text-pretty";
const link = "underline decoration-line underline-offset-5 hover:decoration-paper";

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
                Pouco, e sem o seu nome. O texto completo está em{" "}
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

/** Perguntas frequentes, no rodapé (saíram do Sobre, que ficou só com a história do Kinne). */
export default function FaqPage() {
    return (
        <PageFrame>
            <main className="flex max-w-measure flex-col gap-5 pt-2 desktop:pt-3.5">
                <h1 className="pb-1 font-display text-title font-medium text-balance">
                    Perguntas frequentes
                </h1>
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
            </main>
        </PageFrame>
    );
}
