import Link from "next/link";
import { cx } from "./cx";
import { HomeIcon, InfoIcon } from "./icons";

const TABS = [
    { id: "inicio", href: "/", label: "Início", icon: <HomeIcon /> },
    { id: "sobre", href: "/sobre", label: "Sobre", icon: <InfoIcon /> },
] as const;

export type NavTab = (typeof TABS)[number]["id"];

const item =
    "relative flex h-target items-center gap-2 rounded-pill border border-transparent px-4.5 text-small font-medium whitespace-nowrap transition-colors duration-hover motion-reduce:transition-none";
// hover como o do quiet: fundo hover e borda line-strong; a aba ativa não muda
const idle =
    "text-soft hover:border-line-strong hover:bg-hover hover:text-paper focus-visible:text-paper";
const light = "pointer-events-none absolute animate-limelight motion-reduce:animate-none";

/**
 * Navbar flutuante em chip de vidro escuro: no computador no topo, no celular na base, sempre
 * centralizada. Componente de servidor, sem estado: a página diz qual aba está ativa, e a luz
 * ("limelight", em paper, nunca no amarelo) acende nela. Enquanto existe, a página ganha espaço
 * embaixo e scroll-padding: veja [data-nav] no globals.css. Fica fora da tela do título (Dock), da
 * sala de grupo e da busca.
 */
export function Navbar({ current }: { current: NavTab }) {
    return (
        <nav
            aria-label="Principal"
            data-nav=""
            className="pointer-events-none fixed inset-x-0 top-nav-edge z-nav flex justify-center max-desktop:top-auto max-desktop:nav-bottom"
        >
            <ul className="pointer-events-auto flex h-control items-center rounded-pill border border-line bg-nav p-0.5 shadow-glass backdrop-blur-glass backdrop-saturate-glass">
                {TABS.map((tab) => {
                    const active = tab.id === current;
                    return (
                        <li key={tab.id}>
                            <Link
                                href={tab.href}
                                aria-current={active ? "page" : undefined}
                                className={cx(item, active ? "text-paper" : idle)}
                            >
                                {active && (
                                    <>
                                        <span
                                            aria-hidden="true"
                                            className={cx(
                                                light,
                                                "inset-x-1 inset-y-0 bg-limelight clip-limelight",
                                            )}
                                        />
                                        <span
                                            aria-hidden="true"
                                            className={cx(
                                                light,
                                                "top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-pill bg-paper shadow-limelight",
                                            )}
                                        />
                                    </>
                                )}
                                <span className="relative flex items-center gap-2">
                                    {tab.icon}
                                    {tab.label}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
