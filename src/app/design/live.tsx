"use client";

import { useEffect, useState } from "react";
import { Button } from "../_components/ui/Button";
import { Chip, RadioChip } from "../_components/ui/Chip";
import { GlassPanel } from "../_components/ui/GlassPanel";
import { Slider } from "../_components/ui/Slider";

/** Valor atual de um token, lido do CSS: muda ao passar do celular para o computador. */
export function TokenValue({ name }: { name: string }) {
    const [value, setValue] = useState("");
    useEffect(() => {
        const read = () =>
            setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, [name]);
    return <code className="text-caption break-all text-faint">{value || "…"}</code>;
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
        <GlassPanel className="max-w-panel" aria-label="Exemplo de painel de filtros">
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
                min={6}
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
            <div className="-mx-5 -mb-5 flex flex-col gap-3 bg-panel-foot px-5 pb-5 max-desktop:-mx-4 max-desktop:px-4">
                <div className="flex items-center gap-3.5 border-t border-line px-1 pt-4">
                    <Button variant="primary" className="flex-1" disabled={none}>
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
