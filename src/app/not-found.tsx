import { Shell } from "./_components/Shell";
import { StateScreen } from "./_components/StateScreen";
import { TopBar } from "./_components/TopBar";
import { AsciiType } from "./_components/ui/AsciiType";
import { ButtonLink } from "./_components/ui/Button";

/** Endereço que não existe (o título desconhecido tem a tela dele, em titulo/[slug]). */
export default function NotFound() {
    return (
        <Shell>
            <TopBar back />
            <StateScreen
                heading="Não encontramos esta página"
                text="O endereço pode estar incompleto ou ter mudado."
                art={<AsciiType text="404" className="absolute inset-0 size-full" />}
                action={
                    <ButtonLink variant="primary" href="/">
                        Voltar ao início
                    </ButtonLink>
                }
            />
        </Shell>
    );
}
