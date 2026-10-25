"use client";

import { ButtonLink } from "../ui/Button";
import { UserIcon } from "../ui/icons";
import { rememberReturn } from "./returnTo";
import { SHOW_SIGN_IN } from "./signIn";
import { useAccountStatus } from "./store";

/**
 * "Entrar" para o visitante (US012 C1) e o ícone do perfil para quem tem conta aberta (US014 C1),
 * na barra do topo. Enquanto não se sabe quem está na tela, o lugar fica reservado e invisível,
 * para o resto da barra não se mexer.
 */
export function AccountButton() {
    const status = useAccountStatus();
    if (status.state === "account") {
        return (
            <ButtonLink variant="round" href="/perfil" aria-label="Perfil">
                <UserIcon />
            </ButtonLink>
        );
    }
    // quem já tem sessão mantém o perfil; o visitante só vê "Entrar" com a chave ligada
    if (!SHOW_SIGN_IN) return null;
    return (
        <ButtonLink
            variant="ghost"
            href="/entrar"
            onClick={rememberReturn}
            // aria-hidden e tabIndex: o espaço reservado não é um controle
            {...(status.state === "unknown" && { "aria-hidden": true, tabIndex: -1 })}
            className={status.state === "unknown" ? "invisible" : undefined}
        >
            Entrar
        </ButtonLink>
    );
}
