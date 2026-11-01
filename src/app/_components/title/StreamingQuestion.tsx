"use client";

import { useState, useSyncExternalStore } from "react";
import {
    isOnStreamings,
    streamingToAsk,
    withoutStreaming,
    type Streaming,
    type StreamingService,
} from "@/domain/streaming";
import {
    savedStreamings,
    saveStreamingsInBrowser,
    setRunStreamings,
    streamingAnswers,
    subscribeToStreamings,
} from "@/infrastructure/browser-storage";
import { saveStreamings } from "../../_actions/account";
import { loadAccountStatus, setAccountStatus } from "../account/store";
import { loadError } from "../StateScreen";
import { useStreamings } from "../StreamingProfile";
import { showToast } from "../toast";
import { TextLink } from "../ui/TextLink";

/**
 * Tira o serviço da lista onde ela mora: na conta, com a conta aberta; senão, no navegador. Espera
 * saber quem está na tela antes de calcular, para não gravar a lista do navegador por cima da conta.
 * Devolve a lista nova, ou null se não salvou.
 */
export async function declineStreaming(service: Streaming): Promise<Streaming[] | null> {
    const status = await loadAccountStatus();
    if (status.state !== "account") {
        const next = withoutStreaming(savedStreamings(), service);
        saveStreamingsInBrowser(next);
        setRunStreamings(next);
        return next;
    }
    const next = withoutStreaming(status.account.streamings, service);
    const answer = await saveStreamings({ streamings: next }).catch(() => ({ ok: false }));
    if (!answer.ok) return null;
    setAccountStatus({ state: "account", account: { ...status.account, streamings: next } });
    return next;
}

const WHERE: Record<Streaming, string> = {
    netflix: "na Netflix",
    max: "na Max",
    "prime-video": "no Prime Video",
    "disney-plus": "no Disney+",
    globoplay: "no Globoplay",
};

type QuestionProps = {
    available: readonly StreamingService[];
    /** o título deixou de estar em algum streaming da pessoa */
    onLeft: () => void;
};

/** "Disponível na X · Você assina? Sim · Não" (US018 C2, C3). Ignorar não faz nada. */
export function StreamingQuestion({ available, onLeft }: QuestionProps) {
    const streamings = useStreamings();
    const answers = useSyncExternalStore(
        subscribeToStreamings,
        () => JSON.stringify(streamingAnswers.read()),
        () => "[]",
    );
    const answered = JSON.parse(answers) as Streaming[];
    const [busy, setBusy] = useState(false);
    const service = streamingToAsk(available, streamings, answered);
    if (!service) return null;

    async function decline(id: Streaming) {
        setBusy(true);
        const next = await declineStreaming(id);
        if (next) {
            streamingAnswers.add(id);
            if (!isOnStreamings(available, next)) onLeft();
        } else {
            showToast(`${loadError.heading}. Tente de novo.`);
        }
        setBusy(false);
    }

    return (
        <span className="mt-1 flex flex-wrap items-center gap-x-2 text-data text-soft">
            <span>Disponível {WHERE[service.id]}</span>
            <span aria-hidden>·</span>
            <span>Você assina?</span>
            <span role="group" aria-label={`Você assina ${service.name}?`} className="flex gap-2">
                <TextLink disabled={busy} onClick={() => streamingAnswers.add(service.id)}>
                    Sim
                </TextLink>
                <span aria-hidden className="self-center">
                    ·
                </span>
                <TextLink disabled={busy} onClick={() => void decline(service.id)}>
                    Não
                </TextLink>
            </span>
        </span>
    );
}
