"use client";

import { type ReactNode, useId, useState } from "react";
import { screenMain } from "../layout";
import { Button } from "../ui/Button";
import { Frame } from "../ui/Frame";
import { NOT_FOUND } from "./messages";

type EntryProps = {
    onCreate: () => Promise<boolean>;
    onJoin: (code: string) => Promise<boolean>;
    art?: ReactNode;
};

// como funciona, em três passos (US011: criar, marcar o que topa, votar)
const STEPS = [
    { title: "Crie a sala", text: "Quem cria mostra o código ou o QR code para o grupo." },
    {
        title: "Cada um marca o que topa",
        text: "No próprio celular: os streamings e os gêneros de cada pessoa.",
    },
    {
        title: "O Kinne propõe, vocês votam",
        text: "Poucas opções que agradam a todo mundo, e sai o filme da noite.",
    },
];

/** Porta de entrada da sala (US011 C1): "Criar uma sala" ou "Entrar com um código". */
export function Entry({ onCreate, onJoin, art }: EntryProps) {
    const [step, setStep] = useState<"choose" | "code">("choose");
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const inputId = useId();
    const errorId = `${inputId}-error`;

    async function run(action: () => Promise<boolean>, message: string) {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            if (!(await action())) setError(message);
        } catch {
            setError(message);
        }
        setBusy(false);
    }

    return (
        <main className={screenMain}>
            {/* o quadro das outras telas, encostado no topo, com o feixe de projetor (art) e, por cima,
                o título e a frase centrados, como abertura de filme */}
            <Frame className="bg-ink">
                {art}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3.5 px-gutter pb-16 text-center desktop:pb-28">
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        Assistir em grupo
                    </h1>
                    <p className="max-w-measure text-tagline text-balance text-paper">
                        Cada pessoa diz o que topa no próprio celular, e o Kinne propõe poucas
                        opções que agradam a todo mundo.
                    </p>
                </div>
            </Frame>
            {/* logo abaixo do quadro: o passo a passo à esquerda e as ações à direita, alinhados
                pelo topo; no celular, as ações primeiro */}
            <div className="flex flex-col gap-8 pt-2 desktop:flex-row-reverse desktop:items-start desktop:justify-between desktop:gap-12 desktop:pt-3.5">
                <div className="flex flex-col gap-3 desktop:shrink-0">
                    {step === "choose" ? (
                        // as duas da mesma largura, a da maior (grid de colunas iguais)
                        <div
                            className="grid grid-cols-2 gap-2.5 desktop:auto-cols-fr desktop:grid-flow-col desktop:grid-cols-none"
                            aria-busy={busy}
                        >
                            <Button
                                variant="primary"
                                disabled={busy}
                                onClick={() =>
                                    run(
                                        onCreate,
                                        "Não conseguimos criar a sala agora. Tente de novo.",
                                    )
                                }
                                className="min-w-0 max-desktop:px-2.5"
                            >
                                Criar uma sala
                            </Button>
                            <Button
                                variant="quiet"
                                onClick={() => setStep("code")}
                                className="min-w-0 max-desktop:px-2.5"
                            >
                                Entrar com um código
                            </Button>
                        </div>
                    ) : (
                        <form
                            className="flex flex-col gap-3 desktop:w-room-code"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void run(() => onJoin(code), NOT_FOUND);
                            }}
                        >
                            <label htmlFor={inputId} className="text-data text-soft">
                                Código da sala
                            </label>
                            <input
                                id={inputId}
                                type="text"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="characters"
                                spellCheck={false}
                                maxLength={12}
                                placeholder="XXXX-XXXX"
                                aria-describedby={error ? errorId : undefined}
                                aria-invalid={error !== null}
                                className="h-control min-w-0 rounded-pill border border-line bg-scrim-strong px-5 font-display text-heading text-paper uppercase placeholder:text-soft"
                            />
                            <div className="grid grid-cols-2 gap-2.5" aria-busy={busy}>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={busy || code.trim() === ""}
                                    className="min-w-0"
                                >
                                    Entrar
                                </Button>
                                <Button
                                    variant="quiet"
                                    onClick={() => setStep("choose")}
                                    className="min-w-0"
                                >
                                    Voltar
                                </Button>
                            </div>
                        </form>
                    )}

                    {error && (
                        <p id={errorId} role="alert" className="max-w-measure text-data text-soft">
                            {error}
                        </p>
                    )}
                </div>
                <ol className="grid gap-6 desktop:flex-1 desktop:grid-cols-3 desktop:gap-10">
                    {STEPS.map((stepItem, i) => (
                        <li
                            key={stepItem.title}
                            className="flex flex-col gap-1.5 border-t border-line pt-4"
                        >
                            <span className="text-caption font-semibold tracking-code text-soft">
                                {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="font-display text-confirm font-medium text-paper">
                                {stepItem.title}
                            </span>
                            <span className="text-small text-pretty text-soft">
                                {stepItem.text}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
        </main>
    );
}
