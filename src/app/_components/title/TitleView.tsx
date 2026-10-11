"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { endOfOptionsHeading } from "@/domain/filters";
import { filteredRun, shownTitles, watchedTitles } from "@/infrastructure/browser-storage";
import type { TitleScreen } from "../../_data/title";
import { screenMain } from "../layout";
import { track } from "../measure";
import { StateScreen } from "../StateScreen";
import { showToast } from "../toast";
import { Button, ButtonLink } from "../ui/Button";
import { cx } from "../ui/cx";
import { Dock } from "../ui/Dock";
import { Fact, Facts } from "../ui/Facts";
import { Frame, FrameImage } from "../ui/Frame";
import { BackIcon, CheckIcon, DiceIcon, PlayIcon } from "../ui/icons";
import { Score } from "../ui/Score";
import { TextLink } from "../ui/TextLink";
import { RECOMMENDATION_SOURCE, titleHref, type Origin } from "./origin";
import { useFilteredDraw } from "./useFilteredDraw";
import { useSurprise } from "./useSurprise";

type TitleViewProps = {
    title: TitleScreen;
    origin: Origin;
    /** a indicação seguinte do dia, só na origem "dia" (US004 C5) */
    nextDailySlug: string | null;
};

// O botão que levou ao título seguinte. A tela é outra depois da navegação, então o foco é
// devolvido ao mesmo botão dela, para quem usa teclado seguir de onde estava.
let focusOnArrival: "seen" | "another" | null = null;

/** Tela do título (US004) com as respostas "Vou assistir" e "Já vi" (US005). */
export function TitleView({ title, origin, nextDailySlug }: TitleViewProps) {
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

    // "Ver de novo" pode voltar ao mesmo título sem trocar de endereço: ele conta como mostrado
    useEffect(() => {
        if (ended) return changeRef.current?.focus();
        shownTitles.add(title.id);
        if (origin === "filtros") filteredRun.see(title.id);
        track("recommendation_shown", { source: RECOMMENDATION_SOURCE[origin], titleId: title.id });
        if (focusOnArrival) (focusOnArrival === "seen" ? seenRef : anotherRef).current?.focus();
        focusOnArrival = null;
    }, [title.id, origin, ended]);

    useEffect(() => {
        if (done) homeRef.current?.focus();
    }, [done]);

    // US004 C2, C4 e C5: outro dos 10 dos filtros, a próxima de hoje (volta à primeira depois da
    // quinta) ou um novo sorteio
    function next(from: "seen" | "another") {
        focusOnArrival = from;
        const stay = () => {
            focusOnArrival = null;
        };
        if (origin === "dia" && nextDailySlug) router.replace(titleHref(nextDailySlug, "dia"));
        else if (origin === "filtros") filtered.draw(stay);
        else surprise.draw(stay);
    }

    function markSeen() {
        watchedTitles.add(title.id);
        showToast(`Anotado: você já viu ${title.title}.`);
        next("seen");
        track("already_watched_clicked", { titleId: title.id });
    }

    function watch() {
        showToast("");
        setDone(true);
        track("will_watch_clicked", { titleId: title.id });
    }

    const anotherLabel = origin === "dia" ? "Próxima de hoje" : "Outra opção";
    const where = title.streaming && `${title.streaming.preposition} ${title.streaming.name}`;

    if (ended) {
        // US004 C3: acabaram os 10 da rodada
        return (
            <StateScreen
                heading={endOfOptionsHeading(filtered.end ?? 0)}
                action={
                    <div className="flex gap-2.5" aria-busy={pending}>
                        <ButtonLink ref={changeRef} variant="primary" href="/?filtros" replace>
                            Mudar filtros
                        </ButtonLink>
                        <Button variant="quiet" onClick={filtered.again}>
                            Ver de novo
                        </Button>
                    </div>
                }
            />
        );
    }

    return (
        <main className={screenMain}>
            <Frame bottomShade>
                {title.backdropImagePath && <FrameImage path={title.backdropImagePath} priority />}
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

            {/* no computador, os botões ficam no canto inferior direito, por cima do texto (C10) */}
            <div className="pt-2 desktop:grid desktop:pt-3.5">
                <div className="flex min-w-0 flex-col desktop:col-start-1 desktop:row-start-1 desktop:gap-3.5">
                    <h1 className="pb-1 font-display text-title font-medium text-balance max-desktop:mb-3 desktop:text-wrap">
                        {title.title}
                    </h1>
                    {title.tagline && (
                        <p className="text-tagline text-paper max-desktop:mb-5">{title.tagline}</p>
                    )}
                    {title.synopsis && <Synopsis text={title.synopsis} />}
                    <Facts className="max-desktop:mt-4">
                        {[title.genre, ...title.facts].map(
                            (text) => text && <Fact key={text}>{text}</Fact>,
                        )}
                    </Facts>
                    {title.streaming && (
                        <p className="text-data text-faint max-desktop:mt-2">
                            Disponível {title.streaming.preposition}{" "}
                            <b className="font-medium text-paper">{title.streaming.name}</b>
                        </p>
                    )}
                </div>

                <Dock
                    tall={done}
                    className="desktop:col-start-1 desktop:row-start-1 desktop:self-end desktop:justify-self-end"
                >
                    {done ? (
                        // US005 C1: no lugar e na altura da fileira de botões
                        <div className="flex items-center gap-4.5 max-desktop:flex-col max-desktop:items-stretch max-desktop:gap-dock-gap">
                            <p className="flex items-center gap-2.5 font-display text-confirm font-medium whitespace-nowrap">
                                <CheckIcon />
                                Combinado.{where && ` Está ${where}.`}
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
                    "max-w-measure text-synopsis text-soft",
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
