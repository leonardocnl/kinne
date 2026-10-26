import type { ReactNode } from "react";
import { AppOpened } from "../AppOpened";
import { Shell } from "../Shell";
import { TopBar } from "../TopBar";
import type { NavTab } from "../ui/Navbar";

/** A moldura das telas da conta: barra do topo com "Voltar", como a da tela do título. */
export function PageFrame({ children, nav }: { children: ReactNode; nav?: NavTab }) {
    return (
        <Shell nav={nav}>
            <AppOpened />
            <TopBar back />
            {children}
        </Shell>
    );
}
