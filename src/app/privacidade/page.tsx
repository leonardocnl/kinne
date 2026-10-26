import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/domain/contact";
import { PageFrame } from "../_components/account/PageFrame";

export const metadata: Metadata = {
    title: "Privacidade · Kinne",
    robots: { index: false, follow: false },
};

/**
 * RASCUNHO para revisão do dono do projeto (US014 RNE003): o texto jurídico definitivo ainda não
 * existe. Descreve só o que o código faz hoje.
 */
export default function PrivacyPage() {
    return (
        <PageFrame>
            <main className="flex max-w-measure flex-col gap-5 pt-2 desktop:pt-3.5">
                <h1 className="pb-1 font-display text-title font-medium text-balance">
                    Privacidade
                </h1>
                <p className="text-data text-faint">
                    Rascunho, ainda em revisão pelo responsável pelo Kinne.
                </p>

                <h2 className="font-display text-heading font-medium">O que guardamos</h2>
                <p className="text-small text-soft">
                    Sem conta, o Kinne guarda o que você escolhe (streamings, gosto e “Já vi”) só no
                    seu navegador. Com conta, guardamos: seu e-mail, seus streamings, os títulos que
                    você marcou como curti, não curti ou vou assistir, os que marcou como “Já vi” e
                    em que passo do primeiro uso você parou. Não pedimos nome, apelido nem senha.
                </p>

                <h2 className="font-display text-heading font-medium">Para que usamos</h2>
                <p className="text-small text-soft">
                    Só para recomendar filmes e séries a você e para mantê-lo conectado. Não
                    vendemos nem compartilhamos esses dados para propaganda.
                </p>
                <p className="text-small text-soft">
                    O Kinne conta visitas sem identificar quem você é.
                </p>

                <h2 className="font-display text-heading font-medium">Por quanto tempo</h2>
                <p className="text-small text-soft">
                    Enquanto a conta existir. A sessão de cada aparelho vale 30 dias e se renova com
                    o uso, até no máximo 90 dias. Os códigos de entrada duram 10 minutos.
                </p>

                <h2 className="font-display text-heading font-medium">Quem trata os dados</h2>
                <p className="text-small text-soft">
                    O banco de dados fica no Neon, o site roda na Vercel e os códigos são enviados
                    pelo Resend. Os dados de filmes e séries vêm do TMDB e do JustWatch, que não
                    recebem os seus dados.
                </p>

                <h2 className="font-display text-heading font-medium">Seus direitos</h2>
                <p className="text-small text-soft">
                    Em “Seu perfil” você vê, corrige e remove o que está guardado, baixa tudo em um
                    arquivo e apaga a conta com um código novo enviado ao seu e-mail. Ao apagar, o
                    gosto, o “Já vi” e as sessões saem do banco de dados na hora.
                </p>

                <h2 className="font-display text-heading font-medium">Contato</h2>
                <p className="text-small text-soft">
                    Para dúvidas ou pedidos sobre seus dados, escreva para{" "}
                    <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="underline decoration-line underline-offset-5 hover:decoration-paper"
                    >
                        {CONTACT_EMAIL}
                    </a>
                    .
                </p>
            </main>
        </PageFrame>
    );
}
