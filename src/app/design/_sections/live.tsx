"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../../_components/ui/Button";
import { Chip, RadioChip } from "../../_components/ui/Chip";
import { RemovableChip } from "../../_components/ui/RemovableChip";
import { GlassPanel } from "../../_components/ui/GlassPanel";
import { Digits, Slider } from "../../_components/ui/Slider";
import { cx } from "../../_components/ui/cx";
import { contrast, wcagLevel } from "./contrast";

// Tudo aqui é lido do CSS já aplicado, e relido ao redimensionar (alguns tokens mudam no
// celular). A página nunca repete um valor à mão.
const cssVar = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function watch(read: () => void) {
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
}

const decimal = (n: number) => n.toFixed(1).replace(".", ",");

/** Valor atual de um token. */
export function TokenValue({ name }: { name: string }) {
    const [value, setValue] = useState("");
    useEffect(() => watch(() => setValue(cssVar(name))), [name]);
    return <code className="text-caption break-all text-faint">{value || "…"}</code>;
}

/** Amostra de cor com valor, uso e contraste sobre ink. */
export function ColorSwatch({
    name,
    className,
    role,
}: {
    name: string;
    className: string;
    role: string;
}) {
    const [value, setValue] = useState("");
    const [ratio, setRatio] = useState<number>();
    useEffect(
        () =>
            watch(() => {
                const color = cssVar(`--color-${name}`);
                setValue(color);
                setRatio(contrast(color, cssVar("--color-ink")));
            }),
        [name],
    );
    const level = ratio === undefined ? undefined : (wcagLevel(ratio) ?? "decorativa");

    return (
        <li className="flex flex-col gap-2">
            <span className={cx("block h-24 border border-line", className)} />
            <span className="flex items-baseline justify-between gap-2">
                <code className="text-data font-semibold text-paper">{name}</code>
                {ratio !== undefined && name !== "ink" && (
                    <span className="text-caption text-soft">
                        {decimal(ratio)}:1 · {level}
                    </span>
                )}
            </span>
            <code className="text-caption break-all text-faint">{value || "…"}</code>
            <span className="text-caption text-soft">{role}</span>
        </li>
    );
}

/** Estilo de texto no tamanho real, com a ficha medida no próprio texto. */
export function TypeSpecimen({
    name,
    className,
    sample,
}: {
    name: string;
    className: string;
    sample: string;
}) {
    const ref = useRef<HTMLParagraphElement>(null);
    const [spec, setSpec] = useState<string[]>([]);
    useEffect(
        () =>
            watch(() => {
                const style = getComputedStyle(ref.current!);
                // o next/font dá nomes como "Darker Grotesque" ou "__Darker_Grotesque_a1b2c3"
                const family = style.fontFamily
                    .split(",")[0]
                    .replace(/["']/g, "")
                    .replace(/^_+|_[0-9a-f]{4,}$/gi, "")
                    .replaceAll("_", " ");
                setSpec([
                    `${family} ${style.fontWeight}`,
                    style.fontSize,
                    cssVar(`--text-${name}--line-height`) || style.lineHeight,
                    cssVar(`--text-${name}--letter-spacing`) || "0",
                ]);
            }),
        [name],
    );

    return (
        <li className="flex flex-col gap-3 border-t border-line pt-4">
            <p ref={ref} className={className}>
                {sample}
            </p>
            <p className="flex flex-wrap gap-x-3 text-caption text-faint">
                <code className="font-semibold text-paper">text-{name}</code>
                <span>{spec.join(" · ") || "…"}</span>
            </p>
        </li>
    );
}

/** Barra desenhada em escala com o valor do token e a largura medida. */
export function Measure({
    label,
    token,
    times,
    note,
    className,
}: {
    label: string;
    token: string;
    note?: string;
    /** passos da escala: o valor é times × token */
    times?: number;
    className: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const [value, setValue] = useState("");
    useEffect(
        () =>
            watch(() => {
                const width = Math.round(ref.current!.getBoundingClientRect().width);
                const base = cssVar(token);
                setValue(`${times ? `${times} × ${base}` : base} · ${width}px`);
            }),
        [token, times],
    );
    return (
        <li className="flex flex-col gap-1.5">
            <span ref={ref} className={cx("block h-2 max-w-full bg-paper", className)} />
            <span className="flex flex-wrap gap-x-3 text-caption">
                <code className="font-semibold text-paper">{label}</code>
                <code className="text-faint">{value || "…"}</code>
                {note && <span className="text-soft">{note}</span>}
            </span>
        </li>
    );
}

/** Barras que andam com cada duração; com movimento reduzido mudam sem animar. */
export function MotionDemo({
    items,
}: {
    items: { name: string; className: string; role: string }[];
}) {
    const [on, setOn] = useState(false);
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-4">
                <Button variant="quiet" aria-pressed={on} onClick={() => setOn((v) => !v)}>
                    {on ? "Voltar ao início" : "Reproduzir"}
                </Button>
                <p className="hidden text-data text-soft motion-reduce:block">
                    Movimento reduzido ligado: as barras mudam sem animar.
                </p>
            </div>
            <ul className="flex flex-col gap-5">
                {items.map((item) => (
                    <li key={item.name} className="flex flex-col gap-2">
                        <span className="block h-1 overflow-hidden bg-rail">
                            <span
                                className={cx(
                                    "block h-full origin-left bg-paper transition-transform ease-settle motion-reduce:transition-none",
                                    on ? "scale-x-100" : "scale-x-0",
                                    item.className,
                                )}
                            />
                        </span>
                        <span className="flex flex-wrap items-baseline gap-x-3 text-caption">
                            <code className="font-semibold text-paper">duration-{item.name}</code>
                            <TokenValue name={`--transition-duration-${item.name}`} />
                            <span className="text-soft">{item.role}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const streamings = ["Netflix", "Max", "Prime Video", "Disney+", "Globoplay"];
const types = ["Filmes", "Séries", "Os dois"];
const durations = ["até 1h30", "até 1h45", "até 2h", "Qualquer"];

/** Painel de filtros de exemplo, com chips e sliders que funcionam. */
export function FiltersDemo() {
    const [picked, setPicked] = useState(["Netflix", "Max"]);
    const [type, setType] = useState("Os dois");
    const [rating, setRating] = useState(6.4);
    const [duration, setDuration] = useState(3);
    const none = picked.length === 0;

    return (
        <GlassPanel className="max-w-filters" aria-label="Exemplo de painel de filtros">
            <div className="flex flex-col gap-2 border-t border-line px-1 pt-3">
                <span id="demo-streamings" className="text-data text-soft">
                    Streamings
                </span>
                <div
                    role="group"
                    aria-labelledby="demo-streamings"
                    className="flex flex-wrap gap-1.5"
                >
                    {streamings.map((name) => (
                        <Chip
                            key={name}
                            pressed={picked.includes(name)}
                            onClick={() =>
                                setPicked((list) =>
                                    list.includes(name)
                                        ? list.filter((item) => item !== name)
                                        : [...list, name],
                                )
                            }
                        >
                            {name}
                        </Chip>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-line px-1 pt-3">
                <span id="demo-type" className="text-data text-soft">
                    Tipo
                </span>
                <div
                    role="radiogroup"
                    aria-labelledby="demo-type"
                    className="flex flex-wrap gap-1.5"
                >
                    {types.map((name) => (
                        <RadioChip
                            key={name}
                            name="demo-type"
                            value={name}
                            checked={type === name}
                            onChange={() => setType(name)}
                        >
                            {name}
                        </RadioChip>
                    ))}
                </div>
            </div>
            <Slider
                className="border-t border-line px-1 pt-3"
                label="Nota TMDB mínima"
                min={6.4}
                max={9}
                step={0.1}
                value={rating}
                valueText={rating.toFixed(1).replace(".", ",")}
                onChange={(event) => setRating(Number(event.target.value))}
            />
            <Slider
                className="border-t border-line px-1 pt-3"
                label="Duração do filme"
                min={0}
                max={3}
                step={1}
                value={duration}
                valueText={durations[duration]}
                onChange={(event) => setDuration(Number(event.target.value))}
            />
            <div className="-mx-5 -mb-5 flex flex-col gap-3 px-5 pb-5 max-desktop:-mx-4 max-desktop:px-4">
                <div className="flex items-center gap-3.5 border-t border-line px-1 pt-4">
                    <p className="flex min-w-23 flex-col items-center text-center text-caption text-faint">
                        <b className="pb-1.25 font-display text-count font-medium text-paper">
                            <Digits text={none ? "0" : "2.901"} />
                        </b>
                        <span>títulos combinam</span>
                    </p>
                    <Button variant="primary" className="flex-1 px-2.5" disabled={none}>
                        Ver recomendação
                    </Button>
                </div>
                {none && (
                    <p className="mx-1 text-data text-soft">
                        Tente baixar a nota ou marcar mais um streaming.
                    </p>
                )}
            </div>
        </GlassPanel>
    );
}

/** A pílula da pessoa escolhida nos filtros; remover só a esconde até a próxima visita à página. */
export function RemovableChipDemo({ className }: { className?: string }) {
    const [shown, setShown] = useState(true);
    if (!shown) return <span className="text-data text-faint">Removida</span>;
    return (
        <RemovableChip
            removeLabel="Remover Tom Hanks"
            onRemove={() => setShown(false)}
            className={className}
        >
            Tom Hanks · Atuação
        </RemovableChip>
    );
}
