import type { Metadata, Viewport } from "next";
import { AppOpened } from "../_components/AppOpened";
import { Shell } from "../_components/Shell";
import { TopBar } from "../_components/TopBar";

// A sala é privada e passageira: fora dos buscadores, e o endereço nunca vai como referência para
// outro site (group-room C1). O Referrer-Policy da resposta está em next.config.ts.
export const metadata: Metadata = {
    title: "Assistir em grupo · Kinne",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
};

export const viewport: Viewport = { viewportFit: "cover" };

export default function RoomLayout({ children }: LayoutProps<"/sala">) {
    return (
        <Shell flush>
            <AppOpened />
            <TopBar back floating />
            {children}
        </Shell>
    );
}
