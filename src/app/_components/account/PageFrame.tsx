import type { ReactNode } from "react";
import { AppOpened } from "../AppOpened";
import { Shell } from "../Shell";
import { TopBar } from "../TopBar";

/** A moldura das telas da conta: barra do topo com "Voltar", como a da tela do título. */
export function PageFrame({ children }: { children: ReactNode }) {
    return (
        <Shell>
            <AppOpened />
            <TopBar back />
            {children}
        </Shell>
    );
}
