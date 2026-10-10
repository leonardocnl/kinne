import { Shell } from "./_components/Shell";
import { StateScreen } from "./_components/StateScreen";
import { TopBar } from "./_components/TopBar";
import { ButtonLink } from "./_components/ui/Button";

/** Endereço que não existe, inclusive /titulo/ com slug desconhecido. */
export default function NotFound() {
    return (
        <Shell>
            <TopBar back />
            <StateScreen
                heading="Não encontramos esta página"
                text="O endereço pode estar incompleto, ou o título saiu do catálogo."
                action={
                    <ButtonLink variant="primary" href="/">
                        Voltar ao início
                    </ButtonLink>
                }
            />
        </Shell>
    );
}
