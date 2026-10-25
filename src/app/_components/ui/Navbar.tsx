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
    "relative flex flex-1 h-target items-center justify-center gap-2 rounded-pill text-small font-medium whitespace-nowrap transition-colors duration-hover motion-reduce:transition-none";
// no hover a aba só sobe de soft para paper: sem fundo nem contorno (exceção do DESIGN.md)
const idle = "text-soft hover:text-paper focus-visible:text-paper";

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
            className="pointer-events-none fixed inset-x-0 top-nav-edge z-nav flex justify-center px-gutter max-desktop:top-auto max-desktop:nav-bottom"
        >
            <ul
                style={{ "--nav-index": index } as CSSProperties}
                className="pointer-events-auto relative flex h-control w-full max-w-navbar items-center rounded-pill border border-line bg-nav p-nav-pad shadow-nav backdrop-blur-glass backdrop-saturate-glass"
            >
                {/* a luz vai antes das abas: o texto fica por cima do cone */}
                <li className="flex flex-1 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático: o next/image só somaria JS */}
                    <img
                        src="/icon.svg"
                        alt="Kinne"
                        width={39}
                        height={24}
                        className="h-6 w-auto"
                    />
                </li>
                {/* cone e brilho recortados pelo chip: não passam da borda de baixo */}
                <li
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-pill"
                >
                    <ViewTransition name="limelight" share="limelight" default="none">
                        <div className="absolute top-0 nav-light-x h-0.5 w-nav-light -translate-x-1/2 shadow-limelight">
                            <div className="absolute top-0 left-1/2 h-12 w-nav-cone -translate-x-1/2 bg-limelight clip-limelight">
                                <span className="absolute inset-0 bg-grain-fine opacity-grain-fine mix-blend-overlay" />
                            </div>
                        </div>
                    </ViewTransition>
                </li>
                {/* a barra fica sobre a borda de cima do chip, com halo, e some nas pontas */}
                <ViewTransition name="limelight-bar" share="limelight" default="none">
                    <li
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-px nav-light-x h-px w-nav-light -translate-x-1/2 bg-limelight-bar drop-shadow-limelight"
                    />
                </ViewTransition>
                {TABS.map((tab) => (
                    <li key={tab.id} className="flex flex-1">
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
