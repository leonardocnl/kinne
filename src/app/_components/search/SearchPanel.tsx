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
    // só as setas rolam a lista até a opção; o mouse não, senão a lista pula sob ele
    const byKeys = useRef(false);

    const ready = parseSearchTerm(term) !== null;
    const outcome = ready && answer?.term === term ? answer.outcome : null;
    const results = outcome?.kind === "results" ? outcome.results : [];
    const listId = `${id}-list`;
    const optionId = (i: number) => `${id}-option-${i}`;

    // a lista rola dentro do painel: a opção escolhida pelas setas fica sempre visível
    useEffect(() => {
        if (active >= 0 && byKeys.current)
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
            byKeys.current = true;
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
        ? "Continue digitando."
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
            className="pointer-events-auto z-1 max-desktop:fixed max-desktop:inset-0 max-desktop:flex max-desktop:flex-col max-desktop:gap-3.5 max-desktop:bg-scrim-strong max-desktop:px-4 max-desktop:pt-5.5 max-desktop:pb-5 max-desktop:backdrop-blur-glass desktop:absolute desktop:inset-0"
        >
            <div className="flex items-center gap-2.5 motion-reduce:animate-none desktop:absolute desktop:inset-0 desktop:animate-search-in desktop:gap-1.5">
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

            {/* resultados: no computador, embaixo de navbar e busca, da largura das duas; no celular,
                embaixo do campo. Só depois da primeira letra */}
            <div
                className={cx(
                    "flex min-h-0 flex-col gap-3.5 max-desktop:flex-1 desktop:absolute desktop:top-full desktop:right-0 desktop:mt-2 desktop:max-h-search-panel desktop:w-search-results desktop:rounded-panel desktop:border desktop:border-line desktop:bg-nav desktop:bg-linear-to-b desktop:from-sheen desktop:to-transparent desktop:p-panel desktop:shadow-nav desktop:backdrop-blur-veil desktop:backdrop-brightness-45 desktop:backdrop-saturate-glass",
                    // o painel só aparece depois que a pessoa começa a digitar: antes, o lugar dela é o campo
                    term === "" && "hidden",
                )}
            >
                <ul
                    id={listId}
                    role="listbox"
                    // o mouse saiu da lista: nenhuma linha fica acesa
                    onPointerLeave={() => !byKeys.current && setActive(-1)}
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
                            onPointerMove={() => {
                                byKeys.current = false;
                                setActive(i);
                            }}
                            className={cx(
                                "flex h-result shrink-0 cursor-pointer items-center gap-3.5 rounded-control pr-5 pl-3 transition-colors duration-hover motion-reduce:transition-none desktop:h-result-lg",
                                // a linha ativa (mouse ou setas) só ganha o fundo, sem borda
                                i === active && "bg-hover",
                            )}
                        >
                            {result.posterPath ? (
                                <TmdbImage
                                    sources={posterSources(result.posterPath)}
                                    className="h-poster w-poster-width shrink-0 desktop:h-poster-lg desktop:w-poster-lg-width"
                                />
                            ) : (
                                <span
                                    aria-hidden="true"
                                    className="h-poster w-poster-width shrink-0 bg-frame desktop:h-poster-lg desktop:w-poster-lg-width"
                                />
                            )}
                            <span className="flex min-w-0 flex-col">
                                <span className="truncate text-body text-paper desktop:font-display desktop:text-shot">
                                    {result.title}
                                </span>
                                <span className="text-data text-faint desktop:text-small">
                                    {resultFacts(result)}
                                </span>
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
