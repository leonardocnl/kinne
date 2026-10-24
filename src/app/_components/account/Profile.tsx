"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { AccountTitle, AccountView } from "@/application/accounts";
import { hasSkippedStep } from "@/domain/accounts";
import { STREAMING_SERVICES, type Streaming } from "@/domain/streaming";
import {
    deleteAccount,
    exportMyData,
    requestDeleteCode,
    saveStreamings,
    setSignal,
    setWatched,
    signOutAll,
} from "../../_actions/account";
import { showToast } from "../toast";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { RemovableChip } from "../ui/RemovableChip";
import { TextLink } from "../ui/TextLink";
import { GENERIC_ERROR, TOO_MANY } from "./messages";
import { afterAccountDeleted, leaveAccount } from "./marks";
import { loadAccountStatus, setAccountStatus, useAccountStatus } from "./store";

/** Perfil e "meus dados" (US014): o que o Kinne guarda, para ver, mudar, baixar e apagar. */
export function Profile() {
    const router = useRouter();
    const status = useAccountStatus();

    // a cópia do perfil vem fresca do servidor, com os títulos já nomeados
    useEffect(() => {
        void loadAccountStatus(true);
    }, []);
    useEffect(() => {
        if (status.state === "visitor") router.replace("/entrar");
    }, [status.state, router]);

    if (status.state !== "account") return <main aria-busy="true" className="min-h-dvh" />;
    return <ProfileBody account={status.account} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    const id = useId();
    return (
        <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-line pt-5">
            <h2 id={id} className="font-display text-heading font-medium">
                {title}
            </h2>
            {children}
        </section>
    );
}

function ProfileBody({ account }: { account: AccountView }) {
    const [message, setMessage] = useState<string | null>(null);

    const update = (next: AccountView) => setAccountStatus({ state: "account", account: next });

    async function toggleStreaming(service: Streaming) {
        const next = account.streamings.includes(service)
            ? account.streamings.filter((s) => s !== service)
            : [...account.streamings, service];
        const answer = await saveStreamings({ streamings: next }).catch(() => ({ ok: false }));
        if (answer.ok) update({ ...account, streamings: next });
        else setMessage(GENERIC_ERROR);
    }

    async function removeSignal(title: AccountTitle) {
        const answer = await setSignal({ slug: title.slug, signal: null }).catch(() => ({
            ok: false,
        }));
        if (!answer.ok) return setMessage(GENERIC_ERROR);
        const keep = (list: AccountTitle[]) => list.filter((t) => t.titleId !== title.titleId);
        update({
            ...account,
            liked: keep(account.liked),
            willWatch: keep(account.willWatch),
            disliked: keep(account.disliked),
        });
    }

    async function removeWatched(title: AccountTitle) {
        const answer = await setWatched({ slug: title.slug, on: false }).catch(() => ({
            ok: false,
        }));
        if (!answer.ok) return setMessage(GENERIC_ERROR);
        update({ ...account, watched: account.watched.filter((t) => t.titleId !== title.titleId) });
    }

    return (
        <main className="flex flex-col gap-6 pt-2 desktop:pt-3.5">
            <h1 className="pb-1 font-display text-title font-medium text-balance">Seu perfil</h1>

            {hasSkippedStep(account.onboarding) && (
                <p className="max-w-measure text-tagline text-balance text-soft">
                    Faltou contar um pouco do seu gosto.{" "}
                    <Link
                        href="/boas-vindas"
                        className="font-medium text-paper underline underline-offset-5"
                    >
                        Complete seu gosto
                    </Link>
                </p>
            )}

            <Section title="Conta">
                <p className="text-small text-soft">
                    E-mail: <b className="font-medium text-paper">{account.email}</b>
                </p>
                <p className="text-data text-faint">
                    Conta criada em {new Date(account.createdAt).toLocaleDateString("pt-BR")}.
                </p>
            </Section>

            <Section title="Onde você assiste">
                <div role="group" aria-label="Streamings" className="flex flex-wrap gap-1.5">
                    {STREAMING_SERVICES.map((s) => (
                        <Chip
                            key={s.id}
                            pressed={account.streamings.includes(s.id)}
                            onClick={() => void toggleStreaming(s.id)}
                        >
                            {s.name}
                        </Chip>
                    ))}
                </div>
                <p className="text-data text-faint">Sem nenhum, o Kinne mostra todos.</p>
            </Section>

            <Section title="Seu gosto">
                <TitleList
                    label="Curti"
                    items={account.liked}
                    onRemove={(t) => void removeSignal(t)}
                />
                <TitleList
                    label="Vou assistir"
                    items={account.willWatch}
                    onRemove={(t) => void removeSignal(t)}
                />
                <TitleList
                    label="Não curti"
                    items={account.disliked}
                    onRemove={(t) => void removeSignal(t)}
                />
            </Section>

            <Section title="Já vi">
                <TitleList
                    label="Títulos que você marcou"
                    items={account.watched}
                    onRemove={(t) => void removeWatched(t)}
                />
            </Section>

            {message && (
                <p role="alert" className="max-w-measure text-data text-soft">
                    {message}
                </p>
            )}

            <MyData />
            <Session />
            <p className="text-footnote text-faint">
                <TextLink href="/privacidade">Privacidade</TextLink>
            </p>
        </main>
    );
}

function TitleList({
    label,
    items,
    onRemove,
}: {
    label: string;
    items: AccountTitle[];
    onRemove: (title: AccountTitle) => void;
}) {
    const id = useId();
    return (
        <div className="flex flex-col gap-2">
            <span id={id} className="text-data text-soft">
                {label}
            </span>
            {items.length === 0 ? (
                <p className="text-data text-faint">Nenhum por enquanto.</p>
            ) : (
                <ul aria-labelledby={id} className="flex flex-wrap gap-1.5">
                    {items.map((t) => (
                        <li key={t.titleId} className="max-w-full">
                            <RemovableChip
                                removeLabel={`Remover ${t.title}`}
                                onRemove={() => onRemove(t)}
                            >
                                {t.title}
                            </RemovableChip>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Baixar e apagar (US014 C4, C5). */
function MyData() {
    const router = useRouter();
    const codeId = useId();
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [stage, setStage] = useState<"idle" | "confirm" | "code">("idle");
    const [code, setCode] = useState("");

    async function download() {
        setBusy(true);
        setMessage(null);
        try {
            const data = await exportMyData();
            if (!data) return setMessage(GENERIC_ERROR);
            const url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "kinne-meus-dados.json";
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setMessage(GENERIC_ERROR);
        } finally {
            setBusy(false);
        }
    }

    async function ask() {
        setBusy(true);
        setMessage(null);
        try {
            const answer = await requestDeleteCode();
            if (answer === "sent") {
                setStage("code");
                setCode("");
                setMessage("Mandamos um código novo para o seu e-mail.");
            } else {
                setMessage(answer === "limited" ? TOO_MANY : GENERIC_ERROR);
            }
        } catch {
            setMessage(GENERIC_ERROR);
        }
        setBusy(false);
    }

    async function confirm() {
        setBusy(true);
        setMessage(null);
        try {
            const answer = await deleteAccount({ code });
            if (answer === "deleted") {
                afterAccountDeleted();
                showToast("Sua conta foi apagada.");
                router.replace("/");
                return;
            }
            setMessage(
                answer === "invalid"
                    ? "Código inválido ou vencido."
                    : answer === "locked"
                      ? "Peça um código novo."
                      : answer === "limited"
                        ? TOO_MANY
                        : GENERIC_ERROR,
            );
        } catch {
            setMessage(GENERIC_ERROR);
        }
        setBusy(false);
    }

    return (
        <Section title="Seus dados">
            <p className="max-w-measure text-small text-soft">
                Baixe tudo o que o Kinne guarda sobre você, ou apague a conta de vez.
            </p>
            <div className="flex flex-wrap gap-2.5">
                <Button variant="quiet" disabled={busy} onClick={() => void download()}>
                    Baixar meus dados
                </Button>
                {stage === "idle" && (
                    <Button variant="ghost" onClick={() => setStage("confirm")}>
                        Apagar minha conta
                    </Button>
                )}
            </div>

            {stage === "confirm" && (
                <div className="flex max-w-measure flex-col gap-3">
                    <p className="text-small text-soft">
                        Isso apaga sua conta, seu gosto e seu “Já vi”, e não dá para desfazer. Para
                        confirmar, mandamos um código novo para o seu e-mail.
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                        <Button variant="quiet" disabled={busy} onClick={() => void ask()}>
                            Enviar código
                        </Button>
                        <Button variant="ghost" onClick={() => setStage("idle")}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {stage === "code" && (
                <form
                    className="flex max-w-measure flex-col gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void confirm();
                    }}
                >
                    <label htmlFor={codeId} className="text-data text-soft">
                        Código para apagar a conta
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
                    <div className="flex flex-wrap gap-2.5">
                        <Button
                            type="submit"
                            variant="quiet"
                            disabled={busy || code.replace(/\s/g, "").length !== 6}
                        >
                            Apagar minha conta
                        </Button>
                        <Button variant="ghost" onClick={() => setStage("idle")}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            )}

            {message && (
                <p role="status" className="max-w-measure text-data text-soft">
                    {message}
                </p>
            )}
        </Section>
    );
}

/** Sair e sair de todos os aparelhos (US014 C3). */
function Session() {
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    async function leave(everywhere?: typeof signOutAll) {
        setBusy(true);
        setFailed(false);
        if (await leaveAccount(everywhere)) {
            router.replace("/");
            return;
        }
        // o servidor não confirmou: a conta segue aberta e a pessoa pode tentar de novo (M5)
        setFailed(true);
        setBusy(false);
    }

    return (
        <Section title="Sessão">
            <div className="flex flex-wrap gap-2.5">
                <Button variant="quiet" disabled={busy} onClick={() => void leave()}>
                    Sair
                </Button>
                {!confirming && (
                    <Button variant="ghost" onClick={() => setConfirming(true)}>
                        Sair de todos os aparelhos
                    </Button>
                )}
            </div>
            {failed && (
                <p role="alert" className="max-w-measure text-data text-soft">
                    Não conseguimos sair agora. Sua conta continua aberta; tente de novo.
                </p>
            )}
            {confirming && (
                <div className="flex max-w-measure flex-col gap-3">
                    <p className="text-small text-soft">
                        Você vai precisar de um código novo para entrar de novo em cada aparelho.
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                        <Button
                            variant="quiet"
                            disabled={busy}
                            onClick={() => void leave(signOutAll)}
                        >
                            Sair de todos
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirming(false)}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}
        </Section>
    );
}
