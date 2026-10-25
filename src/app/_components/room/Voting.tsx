"use client";

import { useState } from "react";
import type { RoomView } from "@/application/group-room";
import { STREAMING_SERVICES } from "@/domain/streaming";
import { closeVoting, vote } from "../../_actions/room";
import { showToast } from "../toast";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { TmdbImage } from "../ui/TmdbImage";
import { posterSources } from "../ui/tmdb-sources";
import { TextLink } from "../ui/TextLink";
import { ROOM_ERROR } from "./messages";
import { People } from "./People";

type Room = Extract<RoomView, { kind: "room" }>;

type VotingProps = { view: Room; refresh: () => Promise<void>; onLeave: () => void };

const nameOf = (id: string) => STREAMING_SERVICES.find((s) => s.id === id);

/** Votação (US011 C7): os finalistas e o "Eu toparia" de cada um. Ninguém vê em quem as outras votaram. */
export function Voting({ view, refresh, onLeave }: VotingProps) {
    // quem já votou recomeça da própria cédula; é o único voto que a tela devolve (C4)
    const [picked, setPicked] = useState<number[]>(
        view.finalists.filter((f) => f.mine === true).map((f) => f.titleId),
    );
    const voted = view.finalists.some((f) => f.mine !== null);
    const [sending, setSending] = useState(false);

    async function send(action: () => Promise<{ ok: boolean }>) {
        if (sending) return;
        setSending(true);
        try {
            if (!(await action()).ok) showToast(ROOM_ERROR);
        } catch {
            showToast(ROOM_ERROR);
        }
        await refresh();
        setSending(false);
    }

    return (
        <main className="flex flex-col gap-6 pt-2 desktop:pt-3.5">
            <div className="flex flex-col gap-3">
                <h1 className="pb-1 font-display text-title font-medium text-balance">
                    O que vocês topam?
                </h1>
                <p className="max-w-measure text-tagline text-balance text-soft">
                    Marque quantos quiser e vote. O mais votado vence.
                </p>
            </div>

            <ul className="flex flex-col gap-4">
                {view.finalists.map((f) => {
                    const on = picked.includes(f.titleId);
                    return (
                        <li
                            key={f.titleId}
                            className="flex items-center gap-4 border-t border-line pt-4"
                        >
                            {f.poster ? (
                                <TmdbImage
                                    sources={posterSources(f.poster)}
                                    className="aspect-2/3 w-16 shrink-0"
                                />
                            ) : (
                                <div
                                    className="aspect-2/3 w-16 shrink-0 bg-frame"
                                    aria-hidden="true"
                                />
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <h2 className="font-display text-heading font-medium">
                                    {f.title}
                                    {f.year && <span className="text-soft"> ({f.year})</span>}
                                </h2>
                                {f.where.length > 0 && (
                                    <p className="text-data text-faint">
                                        Disponível{" "}
                                        {f.where
                                            .map(
                                                (id) =>
                                                    `${nameOf(id)?.preposition} ${nameOf(id)?.name}`,
                                            )
                                            .join(" e ")}
                                    </p>
                                )}
                            </div>
                            <Chip
                                pressed={on}
                                aria-label={`Eu toparia: ${f.title}`}
                                onClick={() =>
                                    setPicked(
                                        on
                                            ? picked.filter((id) => id !== f.titleId)
                                            : [...picked, f.titleId],
                                    )
                                }
                            >
                                Eu toparia
                            </Chip>
                        </li>
                    );
                })}
            </ul>

            <div className="flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
                <Button
                    variant="primary"
                    aria-busy={sending}
                    disabled={sending}
                    onClick={() => send(() => vote({ titleIds: picked }))}
                    className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-42"
                >
                    {voted ? "Votar de novo" : "Votar"}
                </Button>
                {view.isCreator && (
                    <Button
                        variant="quiet"
                        disabled={sending}
                        onClick={() => send(closeVoting)}
                        className="max-desktop:min-w-0 max-desktop:flex-1"
                    >
                        Encerrar votação
                    </Button>
                )}
            </div>
            <People view={view} />
            <TextLink onClick={onLeave}>Sair da sala</TextLink>
        </main>
    );
}
