import "server-only";

// A configuração das contas, lida a cada pedido. Variável ausente ou curta demais desliga o que
// depende dela (falha fechada): sem AUTH_SECRET nenhum código nasce.

const MIN_SECRET_LENGTH = 32;

export type AuthConfig = {
    /** chave dos HMAC de e-mail e código; nulo desliga o login */
    secret: string | null;
    resendApiKey: string | null;
    /** remetente dos e-mails, do domínio do Kinne (RNE006) */
    from: string | null;
    /** o envio de desenvolvimento (código no terminal) pode existir: só em `next dev` (C3, B3) */
    devMail: boolean;
};

export function authConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
    const secret = env.AUTH_SECRET;
    return {
        secret: secret && secret.length >= MIN_SECRET_LENGTH ? secret : null,
        resendApiKey: env.RESEND_API_KEY?.trim() || null,
        from: env.AUTH_EMAIL_FROM?.trim() || null,
        // lista de permissão: só NODE_ENV=development, e nunca na Vercel (qualquer VERCEL_ENV, até
        // "development" e "preview"). Qualquer outro valor ("test", "staging", vazio, grafia
        // diferente) fica sem envio de desenvolvimento.
        devMail: env.NODE_ENV === "development" && !env.VERCEL_ENV,
    };
}
