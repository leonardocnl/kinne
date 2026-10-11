import { Button, ButtonLink } from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";

// "Entrar" ainda não tem ação (04-mudancas): fica escondido no teste da semana 0 para não confundir
// quem participa. Para voltar, basta trocar para true.
export const SHOW_SIGN_IN = false;

type TopBarProps = {
    /** data do dia; no celular ela sai daqui e vai para cima do título */
    date?: string;
    /** "Voltar" no lugar de "Entrar"; no celular o voltar fica sobre a imagem */
    back?: boolean;
};

/** Barra do topo: wordmark, data e "Entrar" (se SHOW_SIGN_IN) ou "Voltar", fora da tela inicial. */
export function TopBar({ date, back }: TopBarProps) {
    return (
        <header className="grid grid-cols-3 items-center gap-3 max-desktop:grid-cols-2">
            <Wordmark />
            <p className="justify-self-center text-data whitespace-nowrap text-soft max-desktop:hidden">
                {date}
            </p>
            {back ? (
                <ButtonLink
                    variant="ghost"
                    href="/"
                    icon={<span aria-hidden="true">←</span>}
                    className="justify-self-end max-desktop:hidden"
                >
                    Voltar<span className="sr-only"> ao início</span>
                </ButtonLink>
            ) : (
                SHOW_SIGN_IN && (
                    <Button variant="ghost" className="justify-self-end">
                        Entrar
                    </Button>
                )
            )}
        </header>
    );
}
