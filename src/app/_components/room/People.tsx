import type { RoomView } from "@/application/group-room";
import { CheckIcon } from "../ui/icons";

type Room = Extract<RoomView, { kind: "room" }>;

/**
 * Quem está na sala, como "Pessoa 1", "Pessoa 2"… na ordem de entrada (RNE004), com a marca de
 * quem está pronto (saguão) ou já votou (votação). Sem nomes.
 */
export function People({ view }: { view: Room }) {
    const lobby = view.phase === "lobby";
    return (
        <div className="flex flex-col gap-2">
            <p role="status" className="text-data text-soft">
                {lobby
                    ? `Aguardando pessoas: ${view.people.length} na sala`
                    : `${view.voted} de ${view.people.length} já votaram`}
            </p>
            <ul className="flex flex-col">
                {view.people.map((p) => {
                    const done = lobby ? p.ready : p.voted;
                    return (
                        <li
                            key={p.position}
                            className="flex h-target items-center gap-3 border-b border-line text-small last:border-b-0"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-quiet text-caption font-semibold text-paper">
                                {p.position}
                            </span>
                            <span className={p.isMe ? "font-semibold text-paper" : "text-soft"}>
                                Pessoa {p.position}
                                {p.isMe && " (você)"}
                            </span>
                            <span
                                className={`ml-auto flex items-center gap-1.5 text-caption ${done ? "text-paper" : "text-faint"}`}
                            >
                                {done && <CheckIcon />}
                                {done
                                    ? lobby
                                        ? "pronto"
                                        : "votou"
                                    : lobby
                                      ? "escolhendo"
                                      : "votando"}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
