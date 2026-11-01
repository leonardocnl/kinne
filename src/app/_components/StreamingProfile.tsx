"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { streamingSummary, type Streaming } from "@/domain/streaming";
import { savedStreamings, subscribeToStreamings } from "@/infrastructure/browser-storage";
import { useAccountStatus } from "./account/store";
import { cx } from "./ui/cx";

// Os streamings salvos (US018), do navegador ou da conta. O snapshot é texto para ficar estável
// entre as leituras do localStorage.
const browserSnapshot = () => savedStreamings().join();

export function useStreamings(): Streaming[] {
    const snapshot = useSyncExternalStore(subscribeToStreamings, browserSnapshot, () => "");
    const status = useAccountStatus();
    return status.state === "account"
        ? status.account.streamings
        : ((snapshot ? snapshot.split(",") : []) as Streaming[]);
}

type SummaryProps = {
    className?: string;
    /** o link que abre os filtros; cada tela chega neles de um jeito */
    children: (label: string) => ReactNode;
};

/** "Todos os streamings · escolher os meus" ou "Netflix, Max · alterar" (US018 C4). */
export function StreamingSummary({ className, children }: SummaryProps) {
    const streamings = useStreamings();
    const names = streamingSummary(streamings);
    return (
        <div className={cx("flex flex-wrap items-center gap-x-2 text-data text-soft", className)}>
            <span>{names ?? "Todos os streamings"}</span>
            <span aria-hidden>·</span>
            {children(names ? "alterar" : "escolher os meus")}
        </div>
    );
}
