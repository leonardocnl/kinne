"use client";

import { catchError, type ErrorInfo } from "next/error";
import { loadError, StateScreen } from "../StateScreen";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";

/**
 * Tela inicial sem dados (CM002). "Tentar de novo" busca as indicações outra vez. A barra do topo
 * chega pronta do servidor (`topBar`): importada aqui, ela iria para o JS de cliente da home.
 */
function HomeErrorFallback({ topBar }: { topBar: ReactNode }, { retry }: ErrorInfo) {
    return (
        <>
            {topBar}
            <StateScreen
                {...loadError}
                action={
                    <Button variant="primary" onClick={retry}>
                        Tentar de novo
                    </Button>
                }
            />
        </>
    );
}

export const HomeErrorBoundary = catchError(HomeErrorFallback);
