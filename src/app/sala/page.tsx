import { connection } from "next/server";
import { Suspense } from "react";
import { RoomApp } from "../_components/room/RoomApp";
import { PosterMosaic } from "../_components/ui/PosterMosaic";
import { onboardingGrid } from "../_data/onboarding";

// os pôsteres mais conhecidos do catálogo (a mesma lista em cache do onboarding), lidos na visita
async function RoomMosaic() {
    await connection();
    const titles = await onboardingGrid();
    return (
        <PosterMosaic
            posters={titles.slice(0, 42).map((t) => t.poster)}
            className="absolute inset-0"
        />
    );
}

/** `/sala`: a sala em que a pessoa está, reconhecida pelo cookie de membro (RNE002). */
export default function RoomPage() {
    return (
        <RoomApp
            art={
                <Suspense>
                    <RoomMosaic />
                </Suspense>
            }
        />
    );
}
