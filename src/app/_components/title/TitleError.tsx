"use client";

import { catchError, type ErrorInfo } from "next/error";
import { loadError, StateScreen } from "../StateScreen";
import { Button } from "../ui/Button";

/** Tela do título sem dados (CM002). "Tentar de novo" busca o título outra vez. */
function TitleErrorFallback(_props: object, { retry }: ErrorInfo) {
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

export const TitleErrorBoundary = catchError(TitleErrorFallback);
