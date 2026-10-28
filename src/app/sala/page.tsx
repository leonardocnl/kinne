import { connection } from "next/server";
import { Suspense } from "react";
import { RoomApp } from "../_components/room/RoomApp";
import { RoomShowcase } from "../_components/room/RoomShowcase";
import { onboardingGrid } from "../_data/onboarding";

// a escolha do grupo do exemplo: o título mais conhecido do catálogo (lista em cache), na visita
async function Showcase() {
    await connection();
    const [top] = await onboardingGrid();
    return <RoomShowcase pick={top ? { title: top.title, poster: top.poster } : null} />;
}

/** `/sala`: a sala em que a pessoa está, reconhecida pelo cookie de membro (RNE002). */
export default function RoomPage() {
    return (
        <RoomApp
            art={
                <Suspense fallback={<RoomShowcase pick={null} />}>
                    <Showcase />
                </Suspense>
            }
        />
    );
}
