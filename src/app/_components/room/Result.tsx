"use client";

import { useState } from "react";
import type { RoomView } from "@/application/group-room";
import { nextRound } from "../../_actions/room";
import { Button, ButtonLink } from "../ui/Button";
import { TextLink } from "../ui/TextLink";
import { titleHref } from "../title/origin";
import { ROOM_ERROR } from "./messages";

type Room = Extract<RoomView, { kind: "room" }>;

type ResultProps = { view: Room; refresh: () => Promise<void>; onLeave: () => void };

const FEW = "Poucas opções com essas escolhas. Desmarquem algum filtro.";

/** Resultado (US011 C8, C9): o vencedor, ou "Ninguém topou nenhum" com a outra rodada. */
export function Result({ view, refresh, onLeave }: ResultProps) {
    const winner = view.finalists.find((f) => f.winner);
    const [message, setMessage] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    async function another() {
        if (sending) return;
        setSending(true);
        setMessage(null);
        try {
            const answer = await nextRound();
            if (!answer.ok) setMessage(answer.reason === "few-options" ? FEW : ROOM_ERROR);
        } catch {
            setMessage(ROOM_ERROR);
        }
        await refresh();
        setSending(false);
    }

    return (
        <main className="flex flex-col gap-6 pt-2 desktop:pt-3.5">
            {winner ? (
                <>
                    <p className="text-data text-soft">O grupo topou</p>
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        {winner.title}
                        {winner.year && <span className="text-soft"> ({winner.year})</span>}
                    </h1>
                    <div className="flex flex-wrap gap-2.5">
                        <ButtonLink
                            variant="primary"
                            href={titleHref(winner.slug)}
                            className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                        >
                            Ver este título
                        </ButtonLink>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        Ninguém topou nenhum. Bora outra rodada?
                    </h1>
                    {view.canNextRound && (
                        <div className="flex flex-wrap gap-2.5">
                            <Button
                                variant="primary"
                                disabled={sending}
                                aria-busy={sending}
                                onClick={another}
                                className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                            >
                                Outra rodada
                            </Button>
                        </div>
                    )}
                    {!view.canNextRound && view.round >= 3 && (
                        <p className="max-w-measure text-data text-soft">
                            Foram as três rodadas desta sala.
                        </p>
                    )}
                </>
            )}

            <ul className="flex max-w-measure flex-col gap-2 border-t border-line pt-4">
                {view.finalists.map((f) => (
                    <li
                        key={f.titleId}
                        className="flex items-baseline justify-between gap-4 text-small"
                    >
                        <span className={f.winner ? "font-semibold" : "text-soft"}>{f.title}</span>
                        <span className="text-caption text-faint">
                            {f.approvals === 1 ? "1 voto" : `${f.approvals ?? 0} votos`}
                        </span>
                    </li>
                ))}
            </ul>

            {winner && view.canNextRound && (
                <TextLink onClick={another}>Ver outras opções (outra rodada)</TextLink>
            )}
            {message && (
                <p role="status" className="text-data text-soft">
                    {message}
                </p>
            )}
            <TextLink onClick={onLeave}>Sair da sala</TextLink>
        </main>
    );
}
