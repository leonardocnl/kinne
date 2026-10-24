import "server-only";
import type { Mailer } from "@/application/accounts";
import { authConfig, type AuthConfig } from "./config";

// O envio dos códigos atrás de uma interface só (US012 RNE006): o Resend em produção e, enquanto
// o domínio não existe, um envio de desenvolvimento que escreve o código no terminal. O de
// desenvolvimento NÃO carrega em produção (ameaças C3): lá, sem RESEND_API_KEY, não se envia nada.

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

export function resendMailer(
    apiKey: string,
    from: string,
    fetchImpl: typeof fetch = fetch,
): Mailer {
    return {
        async send(to, message) {
            const response = await fetchImpl(RESEND_URL, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${apiKey}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    from,
                    to: [to],
                    subject: message.subject,
                    text: message.text,
                }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
                redirect: "error",
            });
            // nada da resposta vai para o log: só o status decide
            if (!response.ok) throw new Error("Envio recusado");
        },
    };
}

/**
 * Só fora de produção: o código aparece no terminal de quem roda o servidor. Recusa-se a existir
 * em produção, mesmo que alguém o chame por engano.
 */
export function consoleMailer(config: Pick<AuthConfig, "devMail">): Mailer {
    if (!config.devMail) throw new Error("O envio de desenvolvimento só existe em next dev");
    return {
        async send(to, message) {
            // é o propósito deste envio, e ele só existe fora de produção
            console.info(
                `\n[kinne:dev-mail] para ${to}\n  ${message.subject}\n  ${message.text}\n`,
            );
        },
    };
}

/**
 * Qual envio usar: com RESEND_API_KEY e remetente, o Resend; sem eles, o de desenvolvimento fora
 * de produção; em produção sem chave, nenhum (null): nada é enviado nem impresso.
 */
export function selectMailer(config: AuthConfig = authConfig()): Mailer | null {
    if (config.resendApiKey && config.from) return resendMailer(config.resendApiKey, config.from);
    if (!config.devMail) return null;
    return consoleMailer(config);
}
