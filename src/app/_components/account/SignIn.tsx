"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { requestCode, verifyCode } from "../../_actions/account";
import { Button } from "../ui/Button";
import { TextLink } from "../ui/TextLink";
import { browserData } from "./browserData";
import { GENERIC_ERROR, TOO_MANY } from "./messages";
import { takeReturn } from "./returnTo";
import { clearAccountKeysAndLoad } from "./session";
import { useAccountStatus } from "./store";

const RESEND_AFTER_S = 60;

const SENT = "Se este e-mail puder entrar, o código chega em instantes. Confira também o spam.";

/** Entrar com código (US012 C1 a C6): e-mail, depois o código de 6 dígitos. Nada disto vai para a URL. */
export function SignIn() {
    const router = useRouter();
    const status = useAccountStatus();
    const emailId = useId();
    const codeId = useId();
    const [step, setStep] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    // quando o "Reenviar código" volta a valer (C3); 0 enquanto não houve pedido
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(0);

    useEffect(() => {
        if (step !== "code") return;
        const tick = () => setNow(Date.now());
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [step]);

    // quem já está com a conta aberta não precisa desta tela
    useEffect(() => {
        if (status.state === "account") router.replace("/");
    }, [status.state, router]);

    const waitS = Math.max(0, Math.ceil((resendAt - now) / 1000));

    async function ask() {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const answer = await requestCode({ email });
            if (answer === "sent") {
                setStep("code");
                setCode("");
                setMessage(SENT);
                setResendAt(Date.now() + RESEND_AFTER_S * 1000);
            } else if (answer === "invalid-email") {
                setMessage("Digite um e-mail válido.");
            } else {
                setMessage(answer === "limited" ? TOO_MANY : GENERIC_ERROR);
            }
        } catch {
            setMessage(GENERIC_ERROR);
        }
        setBusy(false);
    }

    async function confirm() {
        if (busy) return;
        setBusy(true);
        setMessage(null);
        try {
            const answer = await verifyCode({ email, code, browser: browserData() });
            if (answer.kind === "ok") {
                // o navegador deixa de guardar o que já foi para a conta (US015 C1)
                await clearAccountKeysAndLoad();
                router.replace(answer.isNew ? "/boas-vindas" : takeReturn());
                return;
            }
            setMessage(
                answer.kind === "invalid"
                    ? "Código inválido ou vencido."
                    : answer.kind === "locked"
                      ? "Peça um código novo."
                      : answer.kind === "limited"
                        ? TOO_MANY
                        : GENERIC_ERROR,
            );
        } catch {
            setMessage(GENERIC_ERROR);
        }
        setBusy(false);
    }

    return (
        <main className="flex flex-col gap-6 pt-2 desktop:pt-3.5">
            <h1 className="pb-1 font-display text-title font-medium text-balance">
                Entrar no Kinne
            </h1>
            <p className="max-w-measure text-tagline text-balance text-soft">
                Sem senha: mandamos um código de 6 dígitos para o seu e-mail.
            </p>

            {step === "email" ? (
                <form
                    className="flex max-w-measure flex-col gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void ask();
                    }}
                >
                    <label htmlFor={emailId} className="text-data text-soft">
                        E-mail
                    </label>
                    <input
                        id={emailId}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        inputMode="email"
                        maxLength={254}
                        required
                        className="h-control min-w-0 rounded-pill border border-line bg-scrim-strong px-5 text-small text-paper placeholder:text-soft"
                        placeholder="ana@exemplo.com"
                    />
                    <div className="flex flex-wrap gap-2.5" aria-busy={busy}>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={busy || email.trim() === ""}
                            className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                        >
                            Receber código
                        </Button>
                    </div>
                </form>
            ) : (
                <form
                    className="flex max-w-measure flex-col gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void confirm();
                    }}
                >
                    <label htmlFor={codeId} className="text-data text-soft">
                        Código enviado para {email.trim().toLowerCase()}
                    </label>
                    <input
                        id={codeId}
                        type="text"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9 ]*"
                        maxLength={7}
                        required
                        className="h-control min-w-0 rounded-pill border border-line bg-scrim-strong px-5 font-display text-heading text-paper placeholder:text-soft"
                        placeholder="000 000"
                    />
                    <div className="flex flex-wrap items-center gap-2.5" aria-busy={busy}>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={busy || code.replace(/\s/g, "").length !== 6}
                            className="max-desktop:min-w-0 max-desktop:flex-1 desktop:min-w-60"
                        >
                            Entrar
                        </Button>
                        <Button
                            variant="quiet"
                            disabled={busy || waitS > 0}
                            onClick={() => void ask()}
                        >
                            {waitS > 0 ? `Reenviar código (${waitS} s)` : "Reenviar código"}
                        </Button>
                    </div>
                    <TextLink
                        onClick={() => {
                            setStep("email");
                            setMessage(null);
                        }}
                    >
                        Usar outro e-mail
                    </TextLink>
                </form>
            )}

            {message && (
                <p role="status" className="max-w-measure text-data text-soft">
                    {message}
                </p>
            )}
            <p className="text-footnote text-faint">
                <TextLink href="/privacidade">Privacidade</TextLink>
            </p>
        </main>
    );
}
