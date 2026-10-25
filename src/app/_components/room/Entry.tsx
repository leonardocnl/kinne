"use client";

import { useId, useState } from "react";
import { Button } from "../ui/Button";
import { NOT_FOUND } from "./messages";

type EntryProps = {
    onCreate: () => Promise<boolean>;
    onJoin: (code: string) => Promise<boolean>;
};

/** Porta de entrada da sala (US011 C1): "Criar uma sala" ou "Entrar com um código". */
export function Entry({ onCreate, onJoin }: EntryProps) {
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
        <main className="flex flex-col gap-6 pt-2 desktop:pt-3.5">
            <h1 className="pb-1 font-display text-title font-medium text-balance">
                Assistir em grupo
            </h1>
            <p className="max-w-measure text-tagline text-balance text-soft">
                Cada pessoa diz o que topa no próprio celular, e o Kinne propõe poucas opções que
                agradam a todo mundo.
            </p>

            {step === "choose" ? (
                <div className="flex flex-wrap gap-2.5" aria-busy={busy}>
                    <Button
                        variant="primary"
                        disabled={busy}
                        onClick={() =>
                            run(onCreate, "Não conseguimos criar a sala agora. Tente de novo.")
                        }
                        className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                    >
                        Criar uma sala
                    </Button>
                    <Button
                        variant="quiet"
                        onClick={() => setStep("code")}
                        className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                    >
                        Entrar com um código
                    </Button>
                </div>
            ) : (
                <form
                    className="flex max-w-measure flex-col gap-3"
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
                    <div className="flex flex-wrap gap-2.5" aria-busy={busy}>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={busy || code.trim() === ""}
                            className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                        >
                            Entrar
                        </Button>
                        <Button variant="quiet" onClick={() => setStep("choose")}>
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
        </main>
    );
}
