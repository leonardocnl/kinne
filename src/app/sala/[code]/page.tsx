import { Suspense } from "react";
import { RoomApp } from "../../_components/room/RoomApp";

/**
 * `/sala/XXXX-XXXX`: o destino do QR code. O código só existe neste caminho; a tela entra na sala
 * e troca o endereço por `/sala` na hora (RNE002). O caminho é lido no pedido, nunca guardado
 * em página pré-gerada.
 */
export default function JoinPage(props: PageProps<"/sala/[code]">) {
    return (
        <Suspense>
            <Join {...props} />
        </Suspense>
    );
}

async function Join({ params }: PageProps<"/sala/[code]">) {
    const { code } = await params;
    return <RoomApp joinCode={code} />;
}
