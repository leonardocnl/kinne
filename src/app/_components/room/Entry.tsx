"use client";

import { useId, useState } from "react";
import { screenMain } from "../layout";
import { Button } from "../ui/Button";
import { NOT_FOUND } from "./messages";

type EntryProps = {
    onCreate: () => Promise<boolean>;
    onJoin: (code: string) => Promise<boolean>;
};

// ícones de linha dos passos, grandes, na cor de quem usa
const line = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
} as const;

const QrIcon = ({ className }: { className: string }) => (
    <svg {...line} className={className}>
        <rect x="6" y="6" width="14" height="14" rx="2" />
        <rect x="28" y="6" width="14" height="14" rx="2" />
        <rect x="6" y="28" width="14" height="14" rx="2" />
        <path d="M11 11h4v4h-4zM33 11h4v4h-4zM11 33h4v4h-4zM28 28h5v5M38 28h4M28 38h4v4M37 37h5v5" />
    </svg>
);

const PhoneIcon = ({ className }: { className: string }) => (
    <svg {...line} className={className}>
        <rect x="13" y="4" width="22" height="40" rx="4" />
        <path d="M21 9h6M18 18h12M18 25h7M28 25h2M18 32h12" />
    </svg>
);

const VoteIcon = ({ className }: { className: string }) => (
    <svg {...line} className={className}>
        <circle cx="24" cy="24" r="18" />
        <path d="m16 24.5 5.5 5.5L32 19" />
    </svg>
);

// como funciona, em três passos (US011: criar, marcar o que topa, votar). A luz amarela passa de
// um para o outro (step-light, com o atraso de cada um)
const STEPS = [
    {
        Icon: QrIcon,
        title: "Crie a sala",
        text: "Quem cria mostra o código ou o QR code para o grupo.",
        delay: "",
    },
    {
        Icon: PhoneIcon,
        title: "Cada um marca o que topa",
        text: "No próprio celular: os streamings e os gêneros de cada pessoa.",
        delay: "step-light-2",
    },
    {
        Icon: VoteIcon,
        title: "O Kinne propõe, vocês votam",
        text: "Poucas opções que agradam a todo mundo, e sai o filme da noite.",
        delay: "step-light-3",
    },
];

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
        <main className={screenMain}>
            {/* o quadro explica a tela: os três passos grandes, lado a lado, e uma luz amarela que
                passa de um para o outro (1 → 2 → 3). A caixa do Frame, em preto, sem granulado; no
                celular, sem proporção fixa, um passo embaixo do outro */}
            <ol className="relative isolate grid gap-10 overflow-hidden bg-ink px-gutter py-12 max-desktop:-mx-gutter desktop:aspect-scope desktop:grid-cols-3 desktop:content-center desktop:gap-12 desktop:px-16">
                {STEPS.map(({ Icon, title, text, delay }, i) => (
                    <li
                        key={title}
                        className="relative flex flex-col gap-3 border-t border-line pt-6"
                    >
                        {/* a luz do passo: o fio de cima e o ícone acendem em amarelo, um de cada vez */}
                        <span
                            aria-hidden="true"
                            className={`absolute -top-px left-0 h-px w-full animate-step-light bg-signal opacity-0 drop-shadow-limelight motion-reduce:animate-none ${delay}`}
                        />
                        <span className="relative size-14">
                            <Icon className="absolute inset-0 size-full text-soft" />
                            <Icon
                                className={`absolute inset-0 size-full animate-step-light text-signal opacity-0 motion-reduce:animate-none ${delay}`}
                            />
                        </span>
                        <span className="mt-4 text-caption font-semibold tracking-code text-soft">
                            {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-display text-heading font-medium text-balance text-paper">
                            {title}
                        </span>
                        <span className="max-w-measure text-body text-pretty text-soft">
                            {text}
                        </span>
                    </li>
                ))}
            </ol>
            {/* como a tela do título: o título e a frase à esquerda; as ações à direita, na altura
                da primeira linha do título. No celular, as ações depois da frase */}
            <div className="title-layout pt-2 max-desktop:flex max-desktop:flex-col max-desktop:gap-8 desktop:pt-3.5">
                <div className="flex min-w-0 flex-col gap-3.5 desktop:col-start-2 desktop:row-span-3 desktop:row-start-1 desktop:mr-12">
                    <h1 className="pb-1 font-display text-title font-medium text-balance">
                        Assistir em grupo
                    </h1>
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
            </div>
        </main>
    );
}
