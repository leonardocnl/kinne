import { AccountButton } from "./account/AccountButton";
import { ButtonLink } from "./ui/Button";
import { BackIcon } from "./ui/icons";

type TopBarProps = {
    /** data do dia; no celular ela sai daqui e vai para cima do título */
    date?: string;
    /** "Voltar" redondo, à esquerda; no celular o voltar fica sobre a imagem */
    back?: boolean;
};

/** Barra do topo: "Voltar" à esquerda fora da tela inicial, a data (tela larga) e "Entrar" ou o perfil (US012, US014). */
export function TopBar({ date, back }: TopBarProps) {
    return (
        <header className="flex items-center gap-3 desktop:min-h-control">
            {back && (
                <ButtonLink
                    variant="round"
                    href="/"
                    aria-label="Voltar ao início"
                    className="max-desktop:hidden"
                >
                    <BackIcon />
                </ButtonLink>
            )}
            <div className="ml-auto flex items-center gap-2.5">
                {/* em tela larga a data fica à direita, deixando o centro para a navbar */}
                <p className="mr-2 text-data whitespace-nowrap text-soft max-wide:hidden">{date}</p>
                <AccountButton />
            </div>
        </header>
    );
}
