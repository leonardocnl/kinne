import Link from "next/link";
import { type CSSProperties, ViewTransition } from "react";
import { SearchLauncher } from "../search/SearchLauncher";
import { cx } from "./cx";
import { glass, navIdle, navItem, navPart, smoke } from "./navItem";

const TABS = [
    { id: "inicio", href: "/", label: "Início" },
    { id: "sobre", href: "/sobre", label: "Sobre" },
] as const;

export type NavTab = (typeof TABS)[number]["id"];

/**
 * Navbar flutuante em chip de vidro escuro: no computador no topo, no celular na base, sempre
 * centralizada, em todas as telas (no celular, acima do Dock). Componente de servidor, sem estado:
 * a página diz qual aba está ativa (nenhuma, fora do Início e do Sobre). Marca (link para
 * o início) e abas são partes iguais do chip (largura fixa no computador, terços no celular),
 * então a luz ("limelight", em amarelo, subindo da borda de baixo) acha a aba pelo índice em --nav-index,
 * sem medir nada. Ela é uma peça só, e o ViewTransition do React a faz deslizar
 * na troca de página. Enquanto a navbar existe, a página ganha espaço embaixo e scroll-padding:
 * veja [data-nav] no globals.css. A busca fica fora do chip, numa lupa de vidro ao lado.
 */
export function Navbar({ current }: { current?: NavTab }) {
    const index = TABS.findIndex((tab) => tab.id === current);
    return (
        <div
            data-nav=""
            className="pointer-events-none fixed inset-x-0 top-nav-edge z-nav flex justify-center px-gutter max-desktop:top-auto max-desktop:nav-bottom"
        >
            {/*
             * Chip e busca andam juntos. No computador o espaço do campo aberto fica sempre reservado
             * (nada muda de largura): fechado, o grupo desliza meio campo para a direita, para o chip
             * e a lupa ficarem no centro. Abrir e fechar só animam transform, clip-path e opacity.
             */}
            <div className="flex gap-nav-gap-x transition-transform duration-panel ease-settle motion-reduce:transition-none max-desktop:w-full desktop:translate-x-nav-shift desktop:has-aria-expanded:translate-x-0">
                <nav
                    aria-label="Principal"
                    className="pointer-events-auto max-desktop:min-w-0 max-desktop:flex-1"
                >
                    <ul
                        style={{ "--nav-index": index } as CSSProperties}
                        className="relative flex h-control items-center rounded-pill border border-transparent p-nav-pad"
                    >
                        {/* o vidro fica numa camada atrás, e não no ul: backdrop-filter num ancestral prenderia
                    a busca em tela cheia do celular (position: fixed) dentro do chip */}
                        <li aria-hidden="true" className={cx(smoke, "absolute -inset-px -z-1")} />
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
                        {/* aba ativa: brilho amarelo que sobe atrás do rótulo, recortado pelo chip, e o traço
                            amarelo na borda de baixo, com halo */}
                        {index >= 0 && (
                            <>
                                <li
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-pill"
                                >
                                    <ViewTransition
                                        name="limelight"
                                        share="limelight"
                                        default="none"
                                    >
                                        <div className="absolute inset-y-0 nav-light-x w-nav-cone -translate-x-1/2 bg-limelight">
                                            <span className="absolute inset-0 bg-grain-fine mask-limelight opacity-grain-fine mix-blend-overlay" />
                                        </div>
                                    </ViewTransition>
                                </li>
                                <ViewTransition
                                    name="limelight-bar"
                                    share="limelight"
                                    default="none"
                                >
                                    <li
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -bottom-px nav-light-x h-px w-nav-light -translate-x-1/2 bg-signal drop-shadow-limelight"
                                    />
                                </ViewTransition>
                            </>
                        )}
                        {TABS.map((tab) => (
                            <li key={tab.id} className={navPart}>
                                <Link
                                    href={tab.href}
                                    aria-current={tab.id === current ? "page" : undefined}
                                    className={cx(
                                        navItem,
                                        tab.id === current ? "text-paper" : navIdle,
                                    )}
                                >
                                    {tab.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                {/*
                 * Busca: um vidro só, recortado pelo caminho de clip-search (veja o globals.css).
                 * Fechada é a lupa; aberta (computador), o campo se estica, a gota do fechar sai na
                 * frente e um fio entre os dois afina e some, como gosma. Só clip-path, transform e
                 * opacity animam. O campo e os resultados chegam com o painel da busca.
                 */}
                <div className="group/search pointer-events-none relative h-control w-control shrink-0 desktop:w-nav-search">
                    <span
                        aria-hidden="true"
                        className={cx(
                            glass,
                            "absolute inset-0 -z-1 transition-all duration-panel ease-settle clip-search motion-reduce:transition-none desktop:group-has-aria-expanded/search:clip-search-open",
                        )}
                    />
                    <span
                        aria-hidden="true"
                        className={cx(
                            glass,
                            "absolute inset-y-2 right-12 -z-1 w-1.5 scale-y-0 motion-reduce:hidden max-desktop:hidden desktop:group-has-aria-expanded/search:animate-goo-neck",
                        )}
                    />
                    <svg
                        aria-hidden="true"
                        data-search-rim=""
                        className="pointer-events-none absolute inset-0 size-full overflow-visible"
                    >
                        <path className="fill-none stroke-line transition-all duration-panel ease-settle rim-search motion-reduce:transition-none desktop:group-has-aria-expanded/search:rim-search-open" />
                    </svg>
                    <SearchLauncher className="pointer-events-auto absolute inset-y-0 left-0 flex w-control cursor-pointer items-center justify-center rounded-pill text-paper transition duration-hover hover:bg-hover aria-expanded:pointer-events-none aria-expanded:opacity-0 motion-reduce:transition-none" />
                </div>
            </div>
        </div>
    );
}
