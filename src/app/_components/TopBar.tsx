import { AccountButton } from "./account/AccountButton";
import { SearchLauncher } from "./search/SearchLauncher";
import { ButtonLink } from "./ui/Button";

type TopBarProps = {
    /** data do dia; no celular ela sai daqui e vai para cima do título */
    date?: string;
    /** "Voltar" ao lado do perfil; no celular o voltar fica sobre a imagem */
    back?: boolean;
};

/** Barra do topo: busca com a data ao lado (computador), "Voltar" fora da tela inicial e "Entrar" ou o perfil (US012, US014). */
export function TopBar({ date, back }: TopBarProps) {
    return (
        <header className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-2.5">
                {/* no computador a data fica junto da busca, deixando o centro para a navbar */}
                <p className="mr-2 text-data whitespace-nowrap text-soft max-desktop:hidden">
                    {date}
                </p>
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
