"use client";

import { useAccountStatus } from "../account/store";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import type { RoomView } from "@/application/group-room";
import { RUNTIME_LIMITS, type TypeChoice } from "@/domain/filters";
import { GENRE_LABELS, KINNE_GENRES, type KinneGenre } from "@/domain/genre";
import { formatCode } from "@/domain/group-room";
import { STREAMING_SERVICES, type Streaming } from "@/domain/streaming";
import { startRoom, updatePreferences } from "../../_actions/room";
import { showToast } from "../toast";
import { Button } from "../ui/Button";
import { Chip, RadioChip } from "../ui/Chip";
import { QrCode } from "../ui/QrCode";
import { Slider } from "../ui/Slider";
import { TextLink } from "../ui/TextLink";
import { ROOM_ERROR } from "./messages";
import { People } from "./People";

type Room = Extract<RoomView, { kind: "room" }>;

const TYPES: { value: TypeChoice; label: string }[] = [
    { value: "movie", label: "Filmes" },
    { value: "series", label: "Séries" },
    { value: "both", label: "Os dois" },
];

const FEW_OPTIONS = "Poucas opções com essas escolhas. Desmarquem algum filtro.";

const noop = () => () => {};
const useOrigin = () =>
    useSyncExternalStore(
        noop,
        () => window.location.origin,
        () => null,
    );

// cada escolha: o rótulo da ficha (caixa alta, pequeno) e os chips embaixo; separadas só por espaço
const section = "flex flex-col gap-3";
const label = "text-caption font-semibold tracking-code text-soft uppercase";

type LobbyProps = { view: Room; refresh: () => Promise<void>; onLeave: () => void };

/** Saguão (US011 C2, C5, C6): o código e o QR code, o que cada pessoa topa e quem está pronto. */
export function Lobby({ view, refresh, onLeave }: LobbyProps) {
    const id = useId();
    const origin = useOrigin();
    // com conta, os streamings são os do perfil e valem na sala (US015 RNE003)
    const hasAccount = useAccountStatus().state === "account";
    const [streamings, setStreamings] = useState<Streaming[]>(view.me.streamings);
    const [genres, setGenres] = useState<KinneGenre[]>(view.me.genres);
    const [ready, setReady] = useState(view.me.ready);
    const [typeChoice, setTypeChoice] = useState<TypeChoice>(view.settings.typeChoice);
    const [maxRuntime, setMaxRuntime] = useState<number | null>(view.settings.maxRuntime);
    const [message, setMessage] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);
    // as mudanças vão uma depois da outra, para a última valer
    const queue = useRef<Promise<unknown>>(Promise.resolve());

    function save(next: {
        streamings: Streaming[];
        genres: KinneGenre[];
        ready: boolean;
        typeChoice: TypeChoice;
        maxRuntime: number | null;
    }) {
        setMessage(null);
        queue.current = queue.current.then(async () => {
            try {
                const answer = await updatePreferences({
                    streamings: next.streamings,
                    genres: next.genres,
                    ready: next.ready,
                    // tipo e duração são de quem criou; as outras pessoas só leem
                    settings: view.isCreator
                        ? { typeChoice: next.typeChoice, maxRuntime: next.maxRuntime }
                        : null,
                });
                if (!answer.ok) showToast(ROOM_ERROR);
            } catch {
                showToast(ROOM_ERROR);
            }
            await refresh();
        });
    }

    const current = { streamings, genres, ready, typeChoice, maxRuntime };
    const change = <K extends keyof typeof current>(key: K, value: (typeof current)[K]) => {
        const next = { ...current, [key]: value };
        // mudar o que se topa tira o "Pronto": o grupo vê o que cada pessoa marcou por último
        if (key !== "ready") next.ready = false;
        setStreamings(next.streamings);
        setGenres(next.genres);
        setReady(next.ready);
        setTypeChoice(next.typeChoice);
        setMaxRuntime(next.maxRuntime);
        save(next);
    };

    async function start() {
        if (starting) return;
        setStarting(true);
        setMessage(null);
        try {
            await queue.current;
            const answer = await startRoom();
            if (!answer.ok) {
                setMessage(answer.reason === "few-options" ? FEW_OPTIONS : ROOM_ERROR);
            }
            await refresh();
        } catch {
            setMessage(ROOM_ERROR);
        }
        setStarting(false);
    }

    const runtime = RUNTIME_LIMITS.findIndex((l) => l.minutes === maxRuntime);
    const settings = view.settings;
    const code = view.code;

    return (
        // uma coluna, como a ficha da tela do título: o convite primeiro (o código grande e o
        // QR code), quem está na sala, o que você topa e, no fim, as ações. Sem caixas nem fios
        <main className="grid gap-12 pt-2 desktop:grid-cols-12 desktop:content-start desktop:items-start desktop:gap-x-16 desktop:pt-nav desktop:pb-12">
            <div className="flex min-w-0 flex-col gap-10 desktop:col-span-8">
                <div className="flex flex-col gap-3.5">
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        Sala de grupo
                    </h1>
                    {code && (
                        <div className="flex flex-col gap-1">
                            <p className={label}>Código da sala</p>
                            <p
                                aria-label={`Código da sala: ${code.split("").join(" ")}`}
                                className="font-display text-title font-medium whitespace-nowrap text-paper"
                            >
                                {formatCode(code)}
                            </p>
                        </div>
                    )}
                    <p className="max-w-measure text-tagline text-pretty text-soft">
                        Quem está junto aponta a câmera para o QR code, ou abre o Kinne em Assistir
                        em grupo e digita o código.
                    </p>
                </div>
                <div className="flex max-w-measure flex-col gap-8">
                    <div className={section}>
                        <span id={`${id}-streamings`} className={label}>
                            Streamings que você assina
                        </span>
                        <div
                            role="group"
                            aria-labelledby={`${id}-streamings`}
                            className="flex flex-wrap gap-1.5"
                        >
                            {STREAMING_SERVICES.map((s) => {
                                const on = streamings.includes(s.id);
                                return (
                                    <Chip
                                        key={s.id}
                                        pressed={on}
                                        disabled={hasAccount}
                                        onClick={() =>
                                            change(
                                                "streamings",
                                                on
                                                    ? streamings.filter((x) => x !== s.id)
                                                    : [...streamings, s.id],
                                            )
                                        }
                                    >
                                        {s.name}
                                    </Chip>
                                );
                            })}
                        </div>
                        {hasAccount && (
                            <p className="text-data text-faint">
                                Estes são os streamings da sua conta. Para mudar, use o seu perfil.
                            </p>
                        )}
                    </div>

                    <div className={section}>
                        <span id={`${id}-genres`} className={label}>
                            Gêneros que você topa
                        </span>
                        <div
                            role="group"
                            aria-labelledby={`${id}-genres`}
                            className="flex flex-wrap gap-1.5"
                        >
                            {KINNE_GENRES.map((g) => {
                                const on = genres.includes(g);
                                return (
                                    <Chip
                                        key={g}
                                        pressed={on}
                                        onClick={() =>
                                            change(
                                                "genres",
                                                on ? genres.filter((x) => x !== g) : [...genres, g],
                                            )
                                        }
                                    >
                                        {GENRE_LABELS[g]}
                                    </Chip>
                                );
                            })}
                        </div>
                    </div>

                    {view.isCreator ? (
                        <>
                            <div className={section}>
                                <span id={`${id}-type`} className={label}>
                                    Tipo
                                </span>
                                <div
                                    role="radiogroup"
                                    aria-labelledby={`${id}-type`}
                                    className="flex flex-wrap gap-1.5"
                                >
                                    {TYPES.map((t) => (
                                        <RadioChip
                                            key={t.value}
                                            name={`${id}-type`}
                                            value={t.value}
                                            checked={typeChoice === t.value}
                                            onChange={() => change("typeChoice", t.value)}
                                        >
                                            {t.label}
                                        </RadioChip>
                                    ))}
                                </div>
                            </div>
                            {typeChoice === "movie" && (
                                <Slider
                                    className={section}
                                    label="Duração do filme"
                                    min={0}
                                    max={RUNTIME_LIMITS.length - 1}
                                    step={1}
                                    value={runtime}
                                    valueText={RUNTIME_LIMITS[runtime].label}
                                    onChange={(event) =>
                                        change(
                                            "maxRuntime",
                                            RUNTIME_LIMITS[Number(event.target.value)].minutes,
                                        )
                                    }
                                />
                            )}
                        </>
                    ) : (
                        <p className={`${section} text-data text-soft`}>
                            Quem criou a sala escolhe o tipo e a duração:{" "}
                            <b className="font-medium text-paper">
                                {TYPES.find((t) => t.value === settings.typeChoice)?.label}
                                {settings.typeChoice === "movie" &&
                                    `, ${RUNTIME_LIMITS.find((l) => l.minutes === settings.maxRuntime)?.label}`}
                            </b>
                        </p>
                    )}
                </div>
                {/* as ações, logo depois das escolhas */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* um amarelo por tela: quem criou tem "Ver as opções"; as outras, "Pronto" */}
                        <Button
                            variant={view.isCreator ? "quiet" : "primary"}
                            aria-pressed={ready}
                            onClick={() => change("ready", !ready)}
                            className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-42"
                        >
                            {ready ? "Pronto ✓" : "Pronto"}
                        </Button>
                        {view.isCreator && (
                            <Button
                                variant="primary"
                                disabled={!view.canStart || starting}
                                aria-busy={starting}
                                onClick={start}
                                className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-42"
                            >
                                Ver as opções
                            </Button>
                        )}
                    </div>
                    {view.isCreator && !view.canStart && (
                        <p className="text-data text-soft">
                            Precisa de pelo menos duas pessoas prontas.
                        </p>
                    )}
                    {message && (
                        <p role="status" className="text-data text-soft">
                            {message}
                        </p>
                    )}
                    <TextLink onClick={onLeave}>Sair da sala</TextLink>
                </div>
            </div>
            {/* à direita, o QR code e, embaixo dele, quem já entrou */}
            <div className="flex w-full flex-col gap-6 desktop:col-span-4 desktop:col-start-9 desktop:max-w-88 desktop:justify-self-end">
                {code && origin && (
                    <QrCode
                        text={`${origin}/sala/${code}`}
                        label="QR code para entrar na sala"
                        className="aspect-square w-full max-desktop:max-w-72"
                    />
                )}
                <People view={view} />
            </div>
        </main>
    );
}
