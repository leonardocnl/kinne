"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { parseSearchTerm, type SearchOutcome, type SearchResult } from "@/domain/search";
import { searchTitles } from "../../_actions/search";
import { goToTitle } from "../title/origin";
import { cx } from "../ui/cx";
import { CloseIcon } from "../ui/icons";
import { TmdbImage } from "../ui/TmdbImage";
import { posterSources } from "../ui/tmdb-sources";

const DEBOUNCE_MS = 300; // B3

// H5: cada resposta tem a sua frase; limite e erro nunca parecem "não existe".
const MESSAGES: Record<Exclude<SearchOutcome["kind"], "results">, string> = {
    elsewhere: "Esse título não está em nenhum desses streamings.",
    none: "Nenhum título encontrado.",
    unavailable: "Não conseguimos buscar agora. Tente de novo em instantes.",
};

const TYPE_LABELS = { movie: "Filme", series: "Série" } as const;

const resultFacts = (r: SearchResult) =>
    [r.year, TYPE_LABELS[r.type]].filter((fact) => fact !== null).join(" · ");

type SearchPanelProps = {
    /** o que já foi digitado antes de o painel carregar */
    initialTerm: string;
    /** fecha o painel; true devolve o foco ao botão que o abriu */
    onClose: (returnFocus: boolean) => void;
};

/**
 * Busca de títulos (threat model docs/threats/title-search.md) no padrão combobox do WAI-ARIA
 * (I3): setas escolhem, Enter abre, Esc fecha. O termo fica só no estado do componente (A8):
 * nem URL, nem histórico (G10).
 */
export default function SearchPanel({ initialTerm, onClose }: SearchPanelProps) {
    const router = useRouter();
    const id = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const [term, setTerm] = useState(initialTerm);
    const [answer, setAnswer] = useState<{ term: string; outcome: SearchOutcome } | null>(null);
    const [active, setActive] = useState(-1);

    const ready = parseSearchTerm(term) !== null;
    const outcome = ready && answer?.term === term ? answer.outcome : null;
    const results = outcome?.kind === "results" ? outcome.results : [];
    const listId = `${id}-list`;
    const optionId = (i: number) => `${id}-option-${i}`;

    // a lista rola dentro do painel: a opção escolhida pelas setas fica sempre visível
    useEffect(() => {
        if (active >= 0)
            document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId deriva de id, estável
    }, [active]);

    useEffect(() => {
        if (!ready) return;
        let current = true;
        const timer = setTimeout(() => {
            searchTitles({ term })
                .catch((): SearchOutcome => ({ kind: "unavailable" }))
                .then((result) => {
                    if (!current) return;
                    setAnswer({ term, outcome: result });
                    setActive(-1);
                });
        }, DEBOUNCE_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [term, ready]);

    // clicar fora fecha, sem roubar o foco de onde a pessoa clicou
    useEffect(() => {
        const outside = (event: PointerEvent) => {
            if (!panelRef.current?.contains(event.target as Node)) onClose(false);
        };
        document.addEventListener("pointerdown", outside);
        return () => document.removeEventListener("pointerdown", outside);
    }, [onClose]);

    function open(result: SearchResult) {
        onClose(false);
        // G7: navegação só no clique, sem prefetch das opções
        goToTitle(router, "push", result.slug, "busca");
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (results.length === 0) return;
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => {
                if (step === 1) return i + 1 >= results.length ? 0 : i + 1;
                return i <= 0 ? results.length - 1 : i - 1;
            });
        } else if (event.key === "Enter" && active >= 0 && results[active]) {
            event.preventDefault();
            open(results[active]);
        }
    }

    const status = !ready
        ? "Digite o nome de um filme ou série."
        : !outcome
          ? "Buscando…"
          : outcome.kind === "results"
            ? null
            : MESSAGES[outcome.kind];
    const count =
        results.length === 1 ? "1 título encontrado." : `${results.length} títulos encontrados.`;

    return (
        <div
            ref={panelRef}
            role="dialog"
            aria-label="Buscar filme ou série"
            onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                onClose(true);
            }}
            className="z-1 max-desktop:fixed max-desktop:inset-0 max-desktop:flex max-desktop:flex-col max-desktop:gap-3.5 max-desktop:bg-scrim-strong max-desktop:px-4 max-desktop:pt-5.5 max-desktop:pb-5 max-desktop:backdrop-blur-glass desktop:absolute desktop:inset-0"
        >
            {/*
             * Gosma (computador): a pílula escorre da lupa até cobrir o chip, e a gota do "fechar"
             * se solta dela para a ponta. O filtro desfoca as duas e corta a transparência, então
             * elas se fundem enquanto estão perto.
             */}
            <svg aria-hidden="true" className="absolute size-0">
                <filter id="kinne-goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feColorMatrix
                        in="blur"
                        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
                        result="goo"
                    />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </svg>
            <div aria-hidden="true" className="absolute inset-0 filter-goo max-desktop:hidden">
                <span className="absolute inset-y-0 right-13.5 left-0 animate-goo-pill rounded-pill bg-goo motion-reduce:animate-none" />
                <span className="absolute inset-y-0 right-0 w-12 animate-goo-drop rounded-pill bg-goo motion-reduce:animate-none" />
            </div>

            <div className="flex items-center gap-2.5 motion-reduce:animate-none desktop:absolute desktop:inset-0 desktop:animate-goo-content desktop:gap-1.5">
                <input
                    // abre já com o cursor no campo: foi para isso que a pessoa tocou na lupa
                    autoFocus
                    // o cursor vai para o fim do que já foi digitado
                    onFocus={(event) => {
                        const end = event.currentTarget.value.length;
                        event.currentTarget.setSelectionRange(end, end);
                    }}
                    type="text"
                    role="combobox"
                    aria-label="Nome do filme ou série"
                    aria-autocomplete="list"
                    aria-expanded={results.length > 0}
                    aria-controls={listId}
                    aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    maxLength={80}
                    placeholder="Buscar filme ou série"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    onKeyDown={onKeyDown}
                    className="h-full min-w-0 flex-1 rounded-pill bg-transparent px-5 text-small text-paper placeholder:text-soft max-desktop:h-control max-desktop:border max-desktop:border-line max-desktop:bg-scrim-strong"
                />
                <button
                    type="button"
                    aria-label="Fechar busca"
                    onClick={() => onClose(true)}
                    className="flex size-control shrink-0 cursor-pointer items-center justify-center rounded-pill text-paper transition-colors duration-hover hover:bg-hover motion-reduce:transition-none max-desktop:border max-desktop:border-line max-desktop:bg-quiet desktop:size-12"
                >
                    <CloseIcon />
                </button>
            </div>

            {/* resultados: embaixo do chip no computador; no celular, embaixo do campo */}
            <div className="flex min-h-0 flex-col gap-3.5 max-desktop:flex-1 desktop:absolute desktop:inset-x-0 desktop:top-full desktop:mt-2 desktop:max-h-search-panel desktop:rounded-panel desktop:border desktop:border-line desktop:bg-glass desktop:bg-linear-to-b desktop:from-scrim-strong desktop:to-scrim-strong desktop:p-panel desktop:shadow-glass desktop:backdrop-blur-glass desktop:backdrop-saturate-glass">
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Títulos encontrados"
                    className={cx(
                        "-mx-2 flex min-h-0 flex-col gap-1 overflow-y-auto overscroll-contain px-2",
                        results.length === 0 && "hidden",
                    )}
                >
                    {results.map((result, i) => (
                        <li
                            key={result.slug}
                            id={optionId(i)}
                            role="option"
                            aria-selected={i === active}
                            onClick={() => open(result)}
                            onPointerMove={() => setActive(i)}
                            className={cx(
                                "flex h-result shrink-0 cursor-pointer items-center gap-3.5 rounded-control pr-5 pl-3 transition duration-hover motion-reduce:transition-none",
                                i === active && "bg-hover outline outline-line-strong",
                            )}
                        >
                            {result.posterPath ? (
                                <TmdbImage
                                    sources={posterSources(result.posterPath)}
                                    className="h-poster w-poster-width shrink-0"
                                />
                            ) : (
                                <span
                                    aria-hidden="true"
                                    className="h-poster w-poster-width shrink-0 bg-frame"
                                />
                            )}
                            <span className="flex min-w-0 flex-col">
                                <span className="truncate text-body text-paper">
                                    {result.title}
                                </span>
                                <span className="text-data text-faint">{resultFacts(result)}</span>
                            </span>
                        </li>
                    ))}
                </ul>

                <p role="status" className={cx("px-1 text-small text-soft", !status && "sr-only")}>
                    {status ?? count}
                </p>
            </div>
        </div>
    );
}
