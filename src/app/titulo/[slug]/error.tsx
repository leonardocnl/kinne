"use client";

import { loadError, StateScreen } from "../../_components/StateScreen";
import { Button } from "../../_components/ui/Button";

/**
 * Tela do título sem dados (CM002). "Tentar de novo" busca o título outra vez. É o error.tsx do
 * segmento, e não um limite dentro da página, para pegar também a falha no generateMetadata.
 */
export default function TitleError({ retry }: { retry: () => void }) {
    return (
        <StateScreen
            {...loadError}
            action={
                <Button variant="primary" onClick={retry}>
                    Tentar de novo
                </Button>
            }
        />
    );
}
