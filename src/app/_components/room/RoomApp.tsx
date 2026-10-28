"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { RoomView } from "@/application/group-room";
import { browserId } from "@/infrastructure/browser-storage";
import { createRoom, joinRoom, leaveRoom } from "../../_actions/room";
import { StateScreen } from "../StateScreen";
import { Button } from "../ui/Button";
import { Entry } from "./Entry";
import { Lobby } from "./Lobby";
import { Result } from "./Result";
import { Voting } from "./Voting";
import { memberDetails } from "./details";
import { NOT_FOUND } from "./messages";
import { useRoom } from "./useRoom";

// Em desenvolvimento o React monta duas vezes: entrar pelo QR code é uma vez só por código.
const joins = new Map<string, Promise<boolean>>();
function joinOnce(code: string) {
    let join = joins.get(code);
    if (!join) {
        join = joinRoom({ code, member: memberDetails() }).then((r) => r.ok);
        joins.set(code, join);
    }
    return join;
}

type RoomAppProps = {
    /** só na rota do QR code (`/sala/XXXX-XXXX`): entra na sala e troca o endereço por `/sala` */
    joinCode?: string;
    /** o que vai no quadro da entrada (o RoomTitleArt, feito no servidor) */
    art?: ReactNode;
};

/**
 * Sala de grupo (US011): preferências, finalistas, votação e resultado. Quem chega pelo QR code
 * entra na sala e o endereço passa a ser `/sala`, sem o código (RNE002, group-room C1).
 */
export function RoomApp({ joinCode, art }: RoomAppProps) {
    const { screen, refresh } = useRoom();
    const router = useRouter();
    const [joinFailed, setJoinFailed] = useState(false);
    const started = useRef(false);

    // O código sai do endereço antes de qualquer outra coisa: nada fica no histórico (C1).
    useEffect(() => {
        if (!joinCode) return;
        window.history.replaceState(null, "", "/sala");
    }, [joinCode]);

    useEffect(() => {
        if (!joinCode || started.current) return;
        started.current = true;
        let live = true;
        // quem recarrega a página do QR já está na sala: o servidor o devolve a ela (RNE002)
        joinOnce(joinCode).then(
            (ok) => {
                if (!live) return;
                if (ok) void refresh();
                else setJoinFailed(true);
            },
            () => live && setJoinFailed(true),
        );
        return () => {
            live = false;
        };
    }, [joinCode, refresh]);

    async function backHome() {
        // apaga o cookie de uma sala que já terminou
        await leaveRoom().catch(() => undefined);
        router.push("/");
    }

    if (joinFailed && screen.kind !== "room") {
        return (
            <StateScreen
                heading={NOT_FOUND}
                action={
                    <Button variant="primary" onClick={backHome}>
                        Voltar ao início
                    </Button>
                }
            />
        );
    }

    if (screen.kind === "loading" || (joinCode && screen.kind === "none")) {
        return (
            <main aria-busy="true" className="min-h-60 desktop:pt-nav">
                <p role="status" className="text-data text-soft">
                    Entrando na sala…
                </p>
            </main>
        );
    }

    if (screen.kind === "ended") {
        return (
            <StateScreen
                heading="Esta sala terminou."
                action={
                    <Button variant="primary" onClick={backHome}>
                        Voltar ao início
                    </Button>
                }
            />
        );
    }

    if (screen.kind === "none") {
        return (
            <Entry
                art={art}
                onCreate={async () => {
                    const answer = await createRoom({
                        browserId: browserId(),
                        member: memberDetails(),
                    });
                    if (answer.ok) await refresh();
                    return answer.ok;
                }}
                onJoin={async (code) => {
                    const answer = await joinRoom({ code, member: memberDetails() });
                    if (answer.ok) await refresh();
                    return answer.ok;
                }}
            />
        );
    }

    const view: RoomView & { kind: "room" } = screen;
    const leave = async () => {
        await leaveRoom().catch(() => undefined);
        router.push("/");
    };
    if (view.phase === "lobby") return <Lobby view={view} refresh={refresh} onLeave={leave} />;
    if (view.phase === "voting") {
        return <Voting key={view.round} view={view} refresh={refresh} onLeave={leave} />;
    }
    return <Result view={view} refresh={refresh} onLeave={leave} />;
}
