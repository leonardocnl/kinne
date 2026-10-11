import { useId, type ComponentProps, type CSSProperties } from "react";
import { cx } from "./cx";

type SliderProps = Omit<ComponentProps<"input">, "type" | "value" | "min" | "max"> & {
    label: string;
    value: number;
    min: number;
    max: number;
    /** o que aparece ao lado do rótulo e é lido por leitores de tela, como "6,4" ou "até 2h" */
    valueText: string;
};

/** Slider com rótulo à esquerda e valor grande à direita (filtros de nota e duração). */
export function Slider({ label, value, min, max, valueText, className, ...rest }: SliderProps) {
    const id = useId();
    const filled = { "--p": `${((value - min) / (max - min)) * 100}%` } as CSSProperties;

    return (
        <div className={cx("flex flex-col", className)}>
            <div className="flex items-baseline justify-between">
                <label htmlFor={id} className="text-data text-soft">
                    {label}
                </label>
                <output htmlFor={id} className="font-display text-count font-medium text-paper">
                    <Digits text={valueText} />
                </output>
            </div>
            <input
                id={id}
                type="range"
                value={value}
                min={min}
                max={max}
                aria-valuetext={valueText}
                style={filled}
                {...rest}
            />
        </div>
    );
}

/**
 * A Darker Grotesque não tem algarismos de largura fixa: cada algarismo vai numa célula, para o
 * valor não tremer ao arrastar; vírgula e ponto ficam com a largura natural. Texto que não é número
 * fica como está.
 */
export function Digits({ text }: { text: string }) {
    if (!/^[\d.,]+$/.test(text)) return text;
    return (
        <>
            <span className="sr-only">{text}</span>
            <span className="inline-flex" aria-hidden="true">
                {[...text].map((char, i) =>
                    /\d/.test(char) ? (
                        <span key={i} className="w-digit text-center">
                            {char}
                        </span>
                    ) : (
                        <span key={i}>{char}</span>
                    ),
                )}
            </span>
        </>
    );
}
