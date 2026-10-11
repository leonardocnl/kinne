"use client";

import { useEffect } from "react";
import { teamBrowser } from "@/infrastructure/browser-storage";
import { StateScreen } from "../_components/StateScreen";
import { ButtonLink } from "../_components/ui/Button";

/** Marca o navegador como da equipe (US006 C1): daqui em diante ele não envia eventos (C2). */
export function TeamMark() {
    useEffect(() => teamBrowser.mark(), []);
    return (
        <StateScreen
            heading="Este navegador é da equipe"
            text="Ele não entra mais na contagem de visitas. Se os dados do navegador forem apagados, abra este endereço de novo."
            action={
                <ButtonLink variant="primary" href="/">
                    Ir para o início
                </ButtonLink>
            }
        />
    );
}
