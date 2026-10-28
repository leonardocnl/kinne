"use client";

import { useId, useRef } from "react";
import { Button } from "./Button";
import { GlassPanel } from "./GlassPanel";
import { CloseIcon } from "./icons";
import { TmdbImage } from "./TmdbImage";
import { posterSources } from "./tmdb-sources";

type CastDialogProps = {
    /** o título, no cabeçalho */
    title: string;
    /** o pôster do título, ao lado do nome; sem ele, só o texto */
    poster: string | null;
    /** o elenco guardado, na ordem dos créditos, com o personagem quando há */
    cast: readonly { name: string; character: string | null }[];
};

/**
 * Botão "Ver N nomes" e o painel de vidro com o elenco todo, no vidro dos filtros: à direita no
 * computador, tela cheia no celular. É um <dialog> modal: o navegador prende o foco e fecha com
 * Esc; ao fechar, o foco volta ao botão, mesmo no Safari, que não foca o botão no clique.
 */
export function CastDialog({ title, poster, cast }: CastDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const openerRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const close = () => ref.current?.close();
    return (
        <>
            {/* na altura do texto da ficha; o alvo de toque (h-target) vem do before */}
            <button
                ref={openerRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => ref.current?.showModal()}
                className="relative cursor-pointer font-medium text-paper underline decoration-line underline-offset-5 transition-colors duration-hover before:absolute before:inset-x-0 before:-inset-y-3.5 hover:decoration-paper motion-reduce:transition-none"
            >
                {count(cast.length)}
            </button>
            <dialog
                ref={ref}
                aria-labelledby={titleId}
                onClose={() => openerRef.current?.focus()}
                // o toque fora do vidro (no fundo escurecido) fecha
                onClick={(event) => event.target === event.currentTarget && close()}
                className="m-0 size-full max-h-none max-w-none border-0 bg-transparent p-0 text-paper backdrop:bg-scrim-strong open:flex open:justify-end desktop:p-4"
            >
                {/* no computador, a altura do conteúdo, até a da janela */}
                <GlassPanel className="min-h-0 overflow-hidden max-desktop:h-full max-desktop:w-full motion-safe:max-desktop:animate-panel-up desktop:h-fit desktop:max-h-panel-height desktop:w-filters motion-safe:desktop:animate-panel-in">
                    <div className="flex items-start justify-between gap-3 px-1">
                        <div className="flex min-w-0 items-end gap-4">
                            {poster && (
                                <TmdbImage
                                    sources={posterSources(poster)}
                                    className="aspect-2/3 w-poster-lg-width shrink-0"
                                />
                            )}
                            <div className="flex min-w-0 flex-col gap-1.5">
                                <h2 id={titleId} className="text-small text-soft">
                                    Elenco · {count(cast.length).slice(4)}
                                </h2>
                                <p className="font-display text-heading font-medium text-balance">
                                    {title}
                                </p>
                            </div>
                        </div>
                        <Button variant="round" aria-label="Fechar elenco" onClick={close}>
                            <CloseIcon />
                        </Button>
                    </div>
                    <div className="relative -mx-1 flex min-h-0 flex-1 flex-col">
                        <ol className="min-h-0 flex-1 overflow-y-auto px-1">
                            {cast.map(({ name, character }, i) => (
                                <li
                                    key={name}
                                    className="flex items-baseline gap-4 border-t border-line py-3.5"
                                >
                                    <span className="w-6 shrink-0 text-caption text-soft">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <span className="flex min-w-0 flex-col gap-1">
                                        <span className="font-display text-confirm font-medium">
                                            {name}
                                        </span>
                                        {character && (
                                            <span className="text-small text-soft">
                                                {character}
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </GlassPanel>
            </dialog>
        </>
    );
}

const count = (n: number) => (n === 1 ? "Ver 1 nome" : `Ver ${n} nomes`);
