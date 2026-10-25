import Link from "next/link";
import { type CSSProperties, ViewTransition } from "react";
import { SearchLauncher } from "../search/SearchLauncher";
import { cx } from "./cx";
import { HomeIcon, InfoIcon } from "./icons";
import { navIdle, navItem, navPart } from "./navItem";

const TABS = [
    { id: "inicio", href: "/", label: "Início", icon: <HomeIcon /> },
    { id: "sobre", href: "/sobre", label: "Sobre", icon: <InfoIcon /> },
] as const;

export type NavTab = (typeof TABS)[number]["id"];

/**
 * Navbar flutuante em chip de vidro escuro: no computador no topo, no celular na base, sempre
 * centralizada, em todas as telas (no celular, acima do Dock). Componente de servidor, sem estado:
 * a página diz qual aba está ativa (nenhuma, fora do Início e do Sobre). Marca (link para
 * o início) e abas são partes iguais do chip (largura fixa no computador, terços no celular),
 * então a luz ("limelight", em paper, nunca no amarelo) acha a aba pelo índice em --nav-index,
 * sem medir nada. Ela é uma peça só, e o ViewTransition do React a faz deslizar
 * na troca de página. Enquanto a navbar existe, a página ganha espaço embaixo e scroll-padding:
 * veja [data-nav] no globals.css. A busca fica fora do chip, numa lupa de vidro ao lado.
 */
export function Navbar({ current }: { current?: NavTab }) {
    const index = TABS.findIndex((tab) => tab.id === current);
    return (
        <div
            data-nav=""
            className="pointer-events-none fixed inset-x-0 top-nav-edge z-nav flex justify-center gap-2 px-gutter max-desktop:top-auto max-desktop:nav-bottom"
        >
            <nav
                aria-label="Principal"
                className="pointer-events-auto max-desktop:min-w-0 max-desktop:flex-1"
            >
                <ul
                    style={{ "--nav-index": index } as CSSProperties}
                    className="relative flex h-control items-center rounded-pill border border-line p-nav-pad shadow-nav"
                >
                    {/* o vidro fica numa camada atrás, e não no ul: backdrop-filter num ancestral prenderia
                    a busca em tela cheia do celular (position: fixed) dentro do chip */}
                    <li
                        aria-hidden="true"
                        className="absolute inset-0 -z-1 rounded-pill bg-nav backdrop-blur-glass backdrop-saturate-glass"
                    />
                    <li className={navPart}>
                        <Link href="/" aria-label="Kinne, ir para o início" className={navItem}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático: o next/image só somaria JS */}
                            <img
                                src="/icon.svg"
                                alt=""
                                width={39}
                                height={24}
                                className="h-6 w-auto"
                            />
                        </Link>
                    </li>
                    {index >= 0 && (
                        <>
                            {/* brilho que desce da barra, recortado pelo chip */}
                            <li
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 overflow-hidden rounded-pill"
                            >
                                <ViewTransition name="limelight" share="limelight" default="none">
                                    <div className="absolute top-0 nav-light-x h-0.5 w-nav-light -translate-x-1/2 shadow-limelight">
                                        <div className="absolute top-0 left-1/2 h-12 w-nav-cone -translate-x-1/2 bg-limelight">
                                            <span className="absolute inset-0 bg-grain-fine mask-limelight opacity-grain-fine mix-blend-overlay" />
                                        </div>
                                    </div>
                                </ViewTransition>
                            </li>
                            {/* a barra fica sobre a borda de cima do chip, com halo */}
                            <ViewTransition name="limelight-bar" share="limelight" default="none">
                                <li
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -top-px nav-light-x h-px w-nav-light -translate-x-1/2 bg-paper drop-shadow-limelight"
                                />
                            </ViewTransition>
                        </>
                    )}
                    {TABS.map((tab) => (
                        <li key={tab.id} className={navPart}>
                            <Link
                                href={tab.href}
                                aria-current={tab.id === current ? "page" : undefined}
                                className={cx(navItem, tab.id === current ? "text-paper" : navIdle)}
                            >
                                {tab.icon}
                                {tab.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            {/* busca: lupa de vidro (o mesmo dos filtros); aberta no computador, vira um campo e
                empurra o chip. O vidro numa camada atrás, pelo mesmo motivo do chip */}
            <div className="pointer-events-auto relative h-control w-control shrink-0 transition-all duration-panel ease-settle motion-reduce:transition-none desktop:has-aria-expanded:w-nav-search">
                <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-1 rounded-pill border border-line bg-glass bg-linear-to-b from-scrim to-scrim shadow-glass backdrop-blur-glass backdrop-saturate-glass"
                />
                <SearchLauncher className="flex size-full cursor-pointer items-center justify-center rounded-pill text-paper transition duration-hover hover:bg-hover aria-expanded:opacity-0 motion-reduce:transition-none" />
            </div>
        </div>
    );
}
