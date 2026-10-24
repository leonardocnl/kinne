import { AccountButton } from "./account/AccountButton";
import { SearchLauncher } from "./search/SearchLauncher";
import { ButtonLink } from "./ui/Button";
import { Wordmark } from "./ui/Wordmark";

type TopBarProps = {
    /** data do dia; no celular ela sai daqui e vai para cima do título */
    date?: string;
    /** "Voltar" ao lado do perfil; no celular o voltar fica sobre a imagem */
    back?: boolean;
};

/** Barra do topo: wordmark, data, busca, "Voltar" fora da tela inicial e "Entrar" ou o perfil (US012, US014). */
export function TopBar({ date, back }: TopBarProps) {
    return (
        <header className="grid grid-cols-3 items-center gap-3 max-desktop:grid-cols-2">
            <Wordmark />
            <p className="justify-self-center text-data whitespace-nowrap text-soft max-desktop:hidden">
                {date}
            </p>
            <div className="flex items-center gap-2.5 justify-self-end">
                <SearchLauncher />
                {back && (
                    <ButtonLink
                        variant="ghost"
                        href="/"
                        icon={<span aria-hidden="true">←</span>}
                        className="max-desktop:hidden"
                    >
                        Voltar<span className="sr-only"> ao início</span>
                    </ButtonLink>
                )}
                <AccountButton />
            </div>
        </header>
    );
}
