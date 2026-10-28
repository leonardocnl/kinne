"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { nextRoundLabel, roundEndHeading, roundEndArt } from "@/domain/rounds";
import { streamingList } from "@/domain/streaming";
import { filteredRun, filtersOnArrival, shownTitles } from "@/infrastructure/browser-storage";
import type { TitleScreen } from "../../_data/title";
import { screenMain } from "../layout";
import { markSignal, markWatched } from "../account/marks";
import { track } from "../measure";
import { StateScreen } from "../StateScreen";
import { showToast } from "../toast";
import { Button, ButtonLink } from "../ui/Button";
import { cx } from "../ui/cx";
import { Dock } from "../ui/Dock";
import { CastDialog } from "../ui/CastDialog";
import { Frame, FrameImage } from "../ui/Frame";
import { BackIcon, CheckIcon, DiceIcon, PlayIcon } from "../ui/icons";
import { Score } from "../ui/Score";
import { TextLink } from "../ui/TextLink";
import { TmdbImage } from "../ui/TmdbImage";
import { AsciiArt } from "../ui/AsciiArt";
import { TitleSpec } from "../ui/TitleSpec";
import { largePosterSources, TITLE_POSTER_SIZES } from "../ui/tmdb-sources";
import { beginWipe, cancelWipe, wipeRouter } from "../ui/wipe";
import { goToTitle, RECOMMENDATION_SOURCE, useOrigin } from "./origin";
import { useFilteredDraw } from "./useFilteredDraw";
import { useSurprise } from "./useSurprise";

type TitleViewProps = {
    title: TitleScreen;
    /** o título entre as indicações de hoje: gênero e a seguinte, usados na origem "dia" (C5) */
    daily: { genre: string; nextSlug: string } | null;
};

// O botão que levou ao título seguinte. A tela é outra depois da navegação, então o foco é
// devolvido ao mesmo botão dela, para quem usa teclado seguir de onde estava.
let focusOnArrival: "seen" | "another" | null = null;

/** Tela do título (US004) com as respostas "Vou assistir" e "Já vi" (US005). */
export function TitleView({ title, daily }: TitleViewProps) {
    // a origem vem da aba (security §8, §9); até a hidratação terminar, ainda não se sabe
    const knownOrigin = useOrigin(title.slug);
    const origin = knownOrigin ?? "link";
    const nextDailySlug = daily?.nextSlug ?? null;
    const genre = origin === "dia" && daily ? daily.genre : title.genre;
    const router = useRouter();
    const surprise = useSurprise("replace");
    const filtered = useFilteredDraw(title.slug);
    const pending = surprise.pending || filtered.pending;
    const ended = filtered.end !== null;
    const [done, setDone] = useState(false);
    const seenRef = useRef<HTMLButtonElement>(null);
    const anotherRef = useRef<HTMLButtonElement>(null);
    const homeRef = useRef<HTMLAnchorElement>(null);
    const changeRef = useRef<HTMLAnchorElement>(null);
    const nextRoundRef = useRef<HTMLButtonElement>(null);

    // "Recomeçar" pode voltar ao mesmo título sem trocar de endereço: ele conta como mostrado
    useEffect(() => {
        // no fim da rodada, o foco vai para a ação principal (recommendation-rounds F2)
        if (ended) return (nextRoundRef.current ?? changeRef.current)?.focus();
        // o evento sai uma vez, com a origem certa, e não com a do servidor
        if (knownOrigin === null) return;
        const origin = knownOrigin;
        shownTitles.add(title.id);
        if (origin === "filtros") filteredRun.see(title.id);
        track("recommendation_shown", { source: RECOMMENDATION_SOURCE[origin], titleId: title.id });
        if (focusOnArrival) (focusOnArrival === "seen" ? seenRef : anotherRef).current?.focus();
        focusOnArrival = null;
    }, [title.id, knownOrigin, ended]);

    useEffect(() => {
        if (done) homeRef.current?.focus();
    }, [done]);

    // US004 C2, C4 e C5: outro dos 10 dos filtros, a próxima de hoje (volta à primeira depois da
    // quinta) ou um novo sorteio
    function next(from: "seen" | "another") {
        focusOnArrival = from;
        // a cortina começa já no clique e cobre também o tempo do sorteio
        beginWipe();
        const stay = () => {
            focusOnArrival = null;
            cancelWipe();
        };
        if (origin === "dia" && nextDailySlug)
            goToTitle(wipeRouter(router), "replace", nextDailySlug, "dia");
        else if (origin === "filtros") filtered.draw(stay);
        else surprise.draw(stay);
    }

    function markSeen() {
        void markWatched({ id: title.id, slug: title.slug });
        showToast(`Anotado: você já viu ${title.title}.`, {
            asking: { id: title.id, slug: title.slug },
        });
        // fora das recomendações não há próxima opção: a tela fica onde está
        if (title.recommendable) next("seen");
        track("already_watched_clicked", { titleId: title.id });
    }

    function watch() {
        // "Vou assistir" também é sinal de gosto (US009 RNE001)
        void markSignal({ id: title.id, slug: title.slug }, "will_watch");
        showToast("");
        setDone(true);
        track("will_watch_clicked", { titleId: title.id });
    }

    const anotherLabel = origin === "dia" ? "Próxima de hoje" : "Outra opção";
    const where = title.streamings.length > 0 && streamingList(title.streamings);

    if (filtered.end) {
        // US004 C3: acabou a rodada de 10; há a seguinte ou acabaram todas
        const end = filtered.end;
        const changeFilters = (variant: "primary" | "quiet") => (
            <ButtonLink
                ref={changeRef}
                variant={variant}
                href="/"
                replace
                onClick={filtersOnArrival.request}
            >
                Mudar filtros
            </ButtonLink>
        );
        return (
            <StateScreen
                heading={roundEndHeading(end)}
                art={
                    // exceção do dono: os caracteres em amarelo, passeando sozinhos (DESIGN.md, Cor)
                    <AsciiArt
                        text={roundEndArt(end)}
                        tone="signal"
                        drift
                        className="absolute inset-0 size-full"
                    />
                }
                action={
                    <div className="flex flex-wrap gap-2.5" aria-busy={pending}>
                        {end.kind === "next" ? (
                            <>
                                <Button
                                    ref={nextRoundRef}
                                    variant="primary"
                                    onClick={filtered.nextRound}
                                >
                                    {nextRoundLabel(end.size)}
                                </Button>
                                {changeFilters("quiet")}
                            </>
                        ) : (
                            <>
                                {changeFilters("primary")}
                                {end.total > 0 && (
                                    <Button variant="quiet" onClick={filtered.again}>
                                        Recomeçar
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                }
            />
        );
    }

    return (
        <main className={screenMain}>
            <Frame bottomShade>
                {title.backdropImagePath && (
                    <FrameImage
                        path={title.backdropImagePath}
                        width={title.backdropWidth}
                        priority
                    />
                )}
                <ButtonLink
                    variant="round"
                    href="/"
                    aria-label="Voltar ao início"
                    className="absolute top-2.5 left-3 desktop:hidden"
                >
                    <BackIcon />
                </ButtonLink>
                {title.trailerUrl && (
                    <ButtonLink
                        variant="quiet"
                        icon={<PlayIcon />}
                        href={title.trailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("trailer_opened", { titleId: title.id })}
                        aria-label={`Ver o trailer de ${title.title} no YouTube (abre em nova aba)`}
                        className="absolute bottom-4 left-4"
                    >
                        Trailer
                    </ButtonLink>
                )}
                <Score value={title.score} />
            </Frame>

            {/* no computador: pôster | texto | ações. As ações ficam na
                altura da primeira linha do título e o texto vai até elas: a sinopse não as move
                (C10). No celular, sem pôster; ações no Dock */}
            <div className="title-layout pt-2 max-desktop:flex max-desktop:flex-col desktop:pt-3.5">
                {title.posterImagePath && (
                    // só no computador; lazy e escondido, o celular nem baixa
                    <TmdbImage
                        sources={largePosterSources(title.posterImagePath)}
                        sizes={TITLE_POSTER_SIZES}
                        className="hidden aspect-2/3 w-title-poster desktop:col-start-1 desktop:row-span-3 desktop:row-start-1 desktop:mr-12 desktop:block"
                    />
                )}

                <div className="flex min-w-0 flex-col desktop:col-start-2 desktop:row-span-3 desktop:row-start-1 desktop:mr-12 desktop:gap-3.5">
                    <h1 className="pb-1 font-display text-title font-medium text-balance max-desktop:mb-3 desktop:text-wrap">
                        {title.title}
                    </h1>
                    {/* onde assistir é a informação principal: logo abaixo do título */}
                    {/* gênero, ano e duração na mesma linha, ao lado */}
                    {/* ficha do título: rótulo pequeno em caixa alta e valor no tamanho do texto */}
                    <dl className="flex flex-wrap gap-x-8 gap-y-4 max-desktop:mb-5 desktop:my-2">
                        {title.streamings.length > 0 && (
                            <TitleSpec label="Onde assistir">
                                <span className="font-medium">
                                    {streamingList(title.streamings)}
                                </span>
                            </TitleSpec>
                        )}
                        {genre && <TitleSpec label="Gênero">{genre}</TitleSpec>}
                        {title.year && <TitleSpec label="Ano">{title.year}</TitleSpec>}
                        {title.runtime && <TitleSpec label="Duração">{title.runtime}</TitleSpec>}
                        {title.directors && (
                            <TitleSpec label="Direção">{title.directors}</TitleSpec>
                        )}
                        {title.cast.length > 0 && (
                            <TitleSpec label="Elenco">
                                <CastDialog
                                    title={title.title}
                                    poster={title.posterImagePath}
                                    cast={title.cast}
                                />
                            </TitleSpec>
                        )}
                    </dl>
                    {title.tagline && (
                        <p className="max-w-measure text-tagline text-balance text-paper max-desktop:mb-5">
                            {title.tagline}
                        </p>
                    )}
                    {title.synopsis && <Synopsis text={title.synopsis} />}
                </div>

                <Dock
                    tall={done}
                    className="desktop:col-start-3 desktop:row-start-1 desktop:flex desktop:h-title-line desktop:items-center desktop:justify-end"
                >
                    {done ? (
                        // US005 C1: no lugar e na altura da fileira de botões
                        <div className="flex items-center gap-4.5 max-desktop:flex-col max-desktop:items-stretch max-desktop:gap-dock-gap">
                            <p className="flex items-center gap-2.5 font-display text-confirm font-medium whitespace-nowrap">
                                <CheckIcon />
                                Combinado.{where && ` Está em ${where}.`}
                            </p>
                            <ButtonLink ref={homeRef} variant="primary" href="/">
                                Voltar ao início
                            </ButtonLink>
                        </div>
                    ) : (
                        <div className="flex gap-2.5" aria-busy={pending}>
                            <Button
                                variant="primary"
                                onClick={watch}
                                className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-70"
                            >
                                Vou assistir
                            </Button>
                            <Button
                                ref={seenRef}
                                variant="quiet"
                                icon={<CheckIcon />}
                                onClick={markSeen}
                            >
                                Já vi
                            </Button>
                            {title.recommendable && (
                                <Button
                                    ref={anotherRef}
                                    variant="round"
                                    spinIcon
                                    aria-label={anotherLabel}
                                    title={anotherLabel}
                                    onClick={() => {
                                        next("another");
                                        // depois do sorteio: as server actions saem uma por vez
                                        track("another_option_clicked", { titleId: title.id });
                                    }}
                                >
                                    <DiceIcon />
                                </Button>
                            )}
                        </div>
                    )}
                </Dock>
            </div>
        </main>
    );
}

/** Sinopse completa; no celular, 4 linhas com "Ler mais" quando passa disso (US004 C9). */
function Synopsis({ text }: { text: string }) {
    const id = useId();
    const ref = useRef<HTMLParagraphElement>(null);
    const [open, setOpen] = useState(false);
    const [cut, setCut] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () => setCut(element.scrollHeight > element.clientHeight + 1);
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <p
                id={id}
                ref={ref}
                className={cx(
                    "max-w-synopsis text-synopsis text-pretty text-soft",
                    !open && "max-desktop:line-clamp-4",
                )}
            >
                {text}
            </p>
            {(open || cut) && (
                <TextLink
                    aria-controls={id}
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                    className="mt-1 desktop:hidden"
                >
                    {open ? "Ler menos" : "Ler mais"}
                </TextLink>
            )}
        </>
    );
}
