import { Button, ButtonLink } from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";

type TopBarProps = {
    /** data do dia; no celular ela sai daqui e vai para cima do título */
    date?: string;
    /** "Voltar" no lugar de "Entrar"; no celular o voltar fica sobre a imagem */
    back?: boolean;
};

/** Barra do topo: wordmark, data e "Entrar" (ou "Voltar", fora da tela inicial). */
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
                // ainda sem ação: o que "Entrar" faz na semana 0 está pendente (04-mudancas)
                <Button variant="ghost" className="justify-self-end">
                    Entrar
                </Button>
            )}
        </header>
    );
}
