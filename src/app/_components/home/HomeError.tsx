"use client";

import { catchError, type ErrorInfo } from "next/error";
import { Button } from "../ui/Button";
import { Frame } from "../ui/Frame";
import { billingRow, homeMain } from "./layout";
import { TopBar } from "./TopBar";

/** Tela inicial sem dados (CM002). "Tentar de novo" busca as indicações outra vez. */
function HomeErrorFallback(_props: object, { retry }: ErrorInfo) {
    return (
        <>
            <TopBar />
            <main className={homeMain}>
                <Frame className="bg-skeleton" />
                <div className={billingRow}>
                    <div role="alert" className="flex flex-col gap-3.5">
                        <h1 className="pb-1 font-display text-title font-medium text-balance">
                            Não conseguimos carregar agora
                        </h1>
                        <p className="max-w-measure text-tagline text-soft">
                            Pode ser a sua conexão ou o nosso servidor. Tente de novo em alguns
                            segundos.
                        </p>
                    </div>
                    <Button variant="primary" onClick={retry} className="desktop:mb-11.5">
                        Tentar de novo
                    </Button>
                </div>
            </main>
        </>
    );
}

export const HomeErrorBoundary = catchError(HomeErrorFallback);
