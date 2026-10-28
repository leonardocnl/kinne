import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/domain/contact";
import { ToastHost } from "./ToastHost";
import { AsciiHorizon } from "./ui/AsciiHorizon";
import { Navbar, type NavTab } from "./ui/Navbar";

const COLUMNS = [
    {
        title: "Kinne",
        links: [
            { href: "/", label: "Início" },
            { href: "/sobre", label: "Sobre" },
            { href: "/sobre#apoie", label: "Apoie" },
        ],
    },
    {
        title: "Ajuda",
        links: [
            { href: "/perguntas", label: "Perguntas frequentes" },
            { href: "/privacidade", label: "Privacidade" },
        ],
    },
    {
        title: "Contato",
        links: [
            { href: `mailto:${CONTACT_EMAIL}`, label: CONTACT_EMAIL },
            { href: "https://www.linkedin.com/in/leonardocnl", label: "LinkedIn" },
            { href: "https://github.com/leonardocnl", label: "GitHub" },
        ],
    },
];

// links do rodapé, em branco, sempre na parte escura (no celular, a luz fica abaixo deles). No
// hover, sublinhado (sem cor nova)
const footerLink =
    "inline-flex h-target items-center font-display text-reel font-medium text-paper underline-offset-5 hover:underline";

/**
 * Página do Kinne: coluna central, o aviso, a navbar (em toda tela) e o rodapé: a frase, os
 * créditos, as colunas de links e "kinne" gigante com o horizonte dentro das letras.
 * `nav` é a aba ativa da navbar, quando a tela é uma delas.
 */
export function Shell({ children, nav }: { children: ReactNode; nav?: NavTab }) {
    return (
        <div className="page-container flex min-h-dvh flex-col gap-3.5 pt-5.5 pb-7 max-desktop:gap-3">
            {children}
            <ToastHost />
            <Navbar current={nav} />
            {/* rodapé: sobre o horizonte, a frase e os créditos no alto (escuro) e, embaixo (amarelo),
                os links em preto e "kinne" gigante */}
            <footer className="relative isolate mt-auto -mb-7 flex min-h-footer flex-col justify-between gap-16 border-t border-line pt-12 max-desktop:mt-7 desktop:pt-20">
                {/* fundo: o horizonte nasce na linha do rodapé e clareia até a base */}
                <AsciiHorizon className="absolute inset-y-0 left-1/2 -z-1 w-screen -translate-x-1/2" />
                {/* grade editorial: a marca e a frase à esquerda, as colunas de links à direita, todos
                    alinhados pelo topo; embaixo, os créditos */}
                <div className="flex flex-col gap-12 max-desktop:mb-72">
                    <div className="grid gap-12 desktop:grid-cols-12 desktop:gap-x-10">
                        <div className="flex flex-col gap-8 desktop:col-span-5">
                            {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático: o next/image só somaria JS */}
                            <img
                                src="/icon.svg"
                                alt="Kinne"
                                width={78}
                                height={48}
                                className="h-20 w-auto self-start"
                            />
                            <p className="font-display text-title font-medium text-balance">
                                Menos tempo escolhendo. Mais tempo assistindo.
                            </p>
                        </div>
                        <nav
                            aria-label="Rodapé"
                            className="grid grid-cols-2 gap-x-6 gap-y-10 desktop:col-span-7 desktop:grid-cols-3"
                        >
                            {COLUMNS.map((column) => (
                                <div key={column.title} className="flex flex-col gap-1">
                                    <h2 className="text-caption font-semibold tracking-code text-faint uppercase">
                                        {column.title}
                                    </h2>
                                    <ul>
                                        {column.links.map(({ href, label }) => (
                                            <li key={href}>
                                                {href.startsWith("/") ? (
                                                    <Link href={href} className={footerLink}>
                                                        {label}
                                                    </Link>
                                                ) : (
                                                    <a
                                                        href={href}
                                                        className={footerLink}
                                                        {...(href.startsWith("http") && {
                                                            target: "_blank",
                                                            rel: "noopener noreferrer",
                                                        })}
                                                    >
                                                        {label}
                                                    </a>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </nav>
                    </div>
                    <div className="flex flex-col gap-2 text-small text-soft desktop:flex-row desktop:justify-between desktop:gap-10">
                        <p className="text-pretty">
                            Dados de filmes e séries: <b className="font-medium text-paper">TMDB</b>{" "}
                            · Onde assistir: <b className="font-medium text-paper">JustWatch</b>.
                            Este produto usa a API do TMDB, mas não é endossado nem certificado pelo
                            TMDB.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col">
                    {/* "kinne" gigante em preto, na largura toda, com a base cortada, contra a luz */}
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 1000 250"
                        className="relative left-1/2 block aspect-kinne w-screen -translate-x-1/2"
                    >
                        <text
                            x="0"
                            y="300"
                            textLength="1000"
                            lengthAdjust="spacingAndGlyphs"
                            fontSize="440"
                            className="fill-ink font-display font-medium"
                        >
                            kinne
                        </text>
                    </svg>
                </div>
            </footer>
        </div>
    );
}
