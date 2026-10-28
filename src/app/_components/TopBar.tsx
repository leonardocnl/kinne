import { AccountButton } from "./account/AccountButton";
import { ButtonLink } from "./ui/Button";
import { cx } from "./ui/cx";
import { BackIcon } from "./ui/icons";

type TopBarProps = {
    /** "Voltar" redondo, à esquerda; no celular o voltar fica sobre a imagem */
    back?: boolean;
    /** no computador, a barra flutua no topo, sobre a imagem que encosta nele (tela do título) */
    floating?: boolean;
};

/** Barra do topo: "Voltar" à esquerda fora da tela inicial e "Entrar" ou o perfil (US012, US014). */
export function TopBar({ back, floating }: TopBarProps) {
    return (
        <header
            className={cx(
                "flex items-center gap-3 desktop:min-h-control",
                floating &&
                    "desktop:pointer-events-none desktop:fixed desktop:inset-x-0 desktop:top-nav-edge desktop:z-nav desktop:page-container *:desktop:pointer-events-auto",
            )}
        >
            {back && (
                <ButtonLink
                    variant={floating ? "float" : "round"}
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
