import type { RoomView } from "@/application/group-room";

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
            <ul className="flex flex-col gap-1.5">
                {view.people.map((p) => (
                    <li key={p.position} className="flex items-center gap-2 text-small">
                        <span className={p.isMe ? "font-semibold" : "text-soft"}>
                            Pessoa {p.position}
                            {p.isMe && " (você)"}
                        </span>
                        {(lobby ? p.ready : p.voted) && (
                            <span className="text-caption text-faint">
                                {lobby ? "pronto" : "votou"}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
