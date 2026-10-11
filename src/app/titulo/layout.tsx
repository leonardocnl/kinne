import type { Viewport } from "next";
import { AppOpened } from "../_components/AppOpened";
import { Shell } from "../_components/Shell";
import { TopBar } from "../_components/TopBar";

// A barra de botões presa à base usa a área segura do iPhone (env(safe-area-inset-bottom)).
export const viewport: Viewport = { viewportFit: "cover" };

export default function TitleLayout({ children }: LayoutProps<"/titulo">) {
    return (
        <Shell>
            <AppOpened />
            <TopBar back />
            {children}
        </Shell>
    );
}
