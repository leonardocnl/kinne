"use client";

import { catchError, type ErrorInfo } from "next/error";
import { loadError, StateScreen } from "../StateScreen";
import { TopBar } from "../TopBar";
import { Button } from "../ui/Button";

/** Tela inicial sem dados (CM002). "Tentar de novo" busca as indicações outra vez. */
function HomeErrorFallback(_props: object, { retry }: ErrorInfo) {
    return (
        <>
            <TopBar />
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
