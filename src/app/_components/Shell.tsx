import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/domain/contact";
import { ToastHost } from "./ToastHost";
import { Navbar, type NavTab } from "./ui/Navbar";

const links = [
    { href: "/sobre", label: "Sobre" },
    { href: "/perguntas", label: "Perguntas frequentes" },
    { href: "/privacidade", label: "Privacidade" },
    { href: "/sobre#apoie", label: "Apoie" },
];

/**
 * Página do Kinne: coluna central, o aviso, a navbar (em toda tela) e o rodapé com os créditos.
 * `nav` é a aba ativa da navbar, quando a tela é uma delas.
 */
export function Shell({ children, nav }: { children: ReactNode; nav?: NavTab }) {
    return (
        <div className="page-container flex min-h-dvh flex-col gap-3.5 pt-5.5 pb-7 max-desktop:gap-3">
            {children}
            <ToastHost />
            <Navbar current={nav} />
            <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-1.5 border-t border-line pt-4 text-footnote text-faint max-desktop:mt-7 max-desktop:flex-col">
                <div className="flex max-w-measure flex-col gap-1.5">
                    <p>
                        Dados de filmes e séries: <b className="font-medium text-soft">TMDB</b> ·
                        Onde assistir: <b className="font-medium text-soft">JustWatch</b>. Este
                        produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
                    </p>
                    <p>O Kinne conta visitas sem identificar quem você é.</p>
                </div>
                <nav aria-label="Rodapé">
                    <ul className="flex flex-wrap gap-x-5">
                        {links.map(({ href, label }) => (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className="inline-flex h-target items-center underline underline-offset-5"
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="inline-flex h-target items-center underline underline-offset-5"
                            >
                                {CONTACT_EMAIL}
                            </a>
                        </li>
                    </ul>
                </nav>
            </footer>
        </div>
    );
}
