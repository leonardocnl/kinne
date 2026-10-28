import type { ReactNode } from "react";
import { billingRow, screenMain } from "./layout";
import { Frame } from "./ui/Frame";

type StateScreenProps = {
    heading: string;
    text?: string;
    /** a ação principal */
    action: ReactNode;
    /** o que vai dentro do quadro (o "404" em caracteres); sem isso, o quadro fica vazio */
    art?: ReactNode;
};

/** Tela sem título para mostrar: erro (CM002) e endereço inexistente. O quadro fica vazio. */
export function StateScreen({ heading, text, action, art }: StateScreenProps) {
    return (
        <main className={screenMain}>
            {art ? (
                // com o texto em caracteres (404, fim de rodada): a caixa do Frame em preto puro,
                // sem o cinza do skeleton nem o granulado
                <div className="relative isolate aspect-video overflow-hidden bg-ink max-desktop:-mx-gutter desktop:aspect-scope">
                    {art}
                </div>
            ) : (
                <Frame className="bg-skeleton" />
            )}
            <div className={billingRow}>
                <div role="alert" className="flex flex-col gap-3.5">
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        {heading}
                    </h1>
                    {text && <p className="max-w-measure text-tagline text-soft">{text}</p>}
                </div>
                <div className="desktop:mb-11.5">{action}</div>
            </div>
        </main>
    );
}

// Texto do CM002, igual em todas as telas.
export const loadError = {
    heading: "Não conseguimos carregar agora",
    text: "Pode ser a sua conexão ou o nosso servidor. Tente de novo em alguns segundos.",
};
