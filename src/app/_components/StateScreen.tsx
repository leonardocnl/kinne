import type { ReactNode } from "react";
import { billingRow, screenMain } from "./layout";
import { Frame } from "./ui/Frame";

type StateScreenProps = {
    heading: string;
    text: string;
    /** a ação principal */
    action: ReactNode;
};

/** Tela sem título para mostrar: erro (CM002) e endereço inexistente. O quadro fica vazio. */
export function StateScreen({ heading, text, action }: StateScreenProps) {
    return (
        <main className={screenMain}>
            <Frame className="bg-skeleton" />
            <div className={billingRow}>
                <div role="alert" className="flex flex-col gap-3.5">
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        {heading}
                    </h1>
                    <p className="max-w-measure text-tagline text-soft">{text}</p>
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
