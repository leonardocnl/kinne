import { AccountButton } from "./account/AccountButton";
import { ButtonLink } from "./ui/Button";
import { BackIcon } from "./ui/icons";

type TopBarProps = {
    /** "Voltar" redondo, à esquerda; no celular o voltar fica sobre a imagem */
    back?: boolean;
};

/** Barra do topo: "Voltar" à esquerda fora da tela inicial e "Entrar" ou o perfil (US012, US014). */
export function TopBar({ back }: TopBarProps) {
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
                <AccountButton />
            </div>
        </header>
    );
}
