"use client";

import { type ReactNode, useId, useState } from "react";
import { screenMain } from "../layout";
import { Button } from "../ui/Button";
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
            {/* a caixa do Frame, sem o granulado: o preto fica preto. Dentro, o título gigante
                contra o horizonte (art, o RoomTitleArt) */}
            <div className="relative isolate aspect-video overflow-hidden bg-ink max-desktop:-mx-gutter desktop:aspect-scope">
                {art}
            </div>
            {/* como a tela do título: o título, a frase e os passos à esquerda; as ações à direita,
                na altura da primeira linha do título. No celular, as ações depois da frase */}
            <div className="title-layout pt-2 max-desktop:flex max-desktop:flex-col max-desktop:gap-8 desktop:pt-3.5">
                <div className="flex min-w-0 flex-col gap-3.5 desktop:col-start-2 desktop:row-span-3 desktop:row-start-1 desktop:mr-12">
                    {/* o título aparece gigante no quadro (RoomTitleArt); aqui fica para leitores */}
                    <h1 className="sr-only">Assistir em grupo</h1>
                    <p className="max-w-measure text-tagline text-balance text-paper">
                        Cada pessoa diz o que topa no próprio celular, e o Kinne propõe poucas
                        opções que agradam a todo mundo.
                    </p>
                </div>
                <div className="flex flex-col gap-3 desktop:col-start-3 desktop:row-start-1 desktop:min-h-title-line desktop:justify-center">
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
                <ol className="mt-4 grid gap-6 desktop:col-span-2 desktop:col-start-2 desktop:row-start-4 desktop:mt-8 desktop:grid-cols-3 desktop:gap-10">
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
