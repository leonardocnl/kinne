import type { ReactNode } from "react";
import { ToastHost } from "./ToastHost";

/** Página do Kinne: coluna central, o aviso e o rodapé com os créditos. */
export function Shell({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-page flex-col gap-3.5 px-gutter pt-5.5 pb-7 max-desktop:gap-3">
            {children}
            <ToastHost />
            <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-1.5 border-t border-line pt-4 text-footnote text-faint max-desktop:mt-7 max-desktop:flex-col">
                <p>
                    Dados de filmes e séries: <b className="font-medium text-soft">TMDB</b> · Onde
                    assistir: <b className="font-medium text-soft">JustWatch</b>. Este produto usa a
                    API do TMDB, mas não é endossado nem certificado pelo TMDB.
                </p>
                <p>O Kinne conta visitas sem identificar quem você é.</p>
            </footer>
        </div>
    );
}
