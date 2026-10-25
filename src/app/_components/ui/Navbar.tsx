import Link from "next/link";
import { type CSSProperties, ViewTransition } from "react";
import { cx } from "./cx";
import { HomeIcon, InfoIcon } from "./icons";

const TABS = [
    { id: "inicio", href: "/", label: "Início", icon: <HomeIcon /> },
    { id: "sobre", href: "/sobre", label: "Sobre", icon: <InfoIcon /> },
] as const;

export type NavTab = (typeof TABS)[number]["id"];

const item =
    "relative flex h-target w-nav-tab items-center justify-center gap-2 rounded-pill border border-transparent text-small font-medium whitespace-nowrap transition-colors duration-hover motion-reduce:transition-none";
// hover como o do quiet: fundo hover e borda line-strong; a aba ativa não muda
const idle =
    "text-soft hover:border-line-strong hover:bg-hover hover:text-paper focus-visible:text-paper";

/**
 * Navbar flutuante em chip de vidro escuro: no computador no topo, no celular na base, sempre
 * centralizada. Componente de servidor, sem estado: a página diz qual aba está ativa. As abas têm
 * a mesma largura, então a luz ("limelight", em paper, nunca no amarelo) acha a aba pelo índice
 * em --nav-index, sem medir nada. Ela é uma peça só, e o ViewTransition do React a faz deslizar
 * na troca de página. Enquanto a navbar existe, a página ganha espaço embaixo e scroll-padding:
 * veja [data-nav] no globals.css. Fica fora da tela do título (Dock), da sala e da busca.
 */
export function Navbar({ current }: { current: NavTab }) {
    const index = TABS.findIndex((tab) => tab.id === current);
    return (
        <nav
            aria-label="Principal"
            data-nav=""
            className="pointer-events-none fixed inset-x-0 top-nav-edge z-nav flex justify-center max-desktop:top-auto max-desktop:nav-bottom"
        >
            <ul
                style={{ "--nav-index": index } as CSSProperties}
                className="pointer-events-auto relative flex h-control items-center rounded-pill border border-line bg-nav p-nav-pad shadow-glass backdrop-blur-glass backdrop-saturate-glass"
            >
                {/* a luz vai antes das abas: o texto fica por cima do cone */}
                <li className="flex w-nav-icon items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático: o next/image só somaria JS */}
                    <img
                        src="/icon.svg"
                        alt="Kinne"
                        width={39}
                        height={24}
                        className="h-6 w-auto"
                    />
                </li>
                <ViewTransition name="limelight" share="limelight" default="none">
                    <li
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 nav-light-x h-1.25 w-nav-light -translate-x-1/2 rounded-pill bg-paper shadow-limelight"
                    >
                        <span className="absolute top-1.25 left-1/2 h-14 w-nav-cone -translate-x-1/2 bg-limelight clip-limelight" />
                    </li>
                </ViewTransition>
                {TABS.map((tab) => (
                    <li key={tab.id}>
                        <Link
                            href={tab.href}
                            aria-current={tab.id === current ? "page" : undefined}
                            className={cx(item, tab.id === current ? "text-paper" : idle)}
                        >
                            {tab.icon}
                            {tab.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
