import { NotFoundScreen } from "./_components/NotFoundScreen";
import { Shell } from "./_components/Shell";
import { TopBar } from "./_components/TopBar";

/** Endereço que não existe (o título desconhecido tem a tela dele, em titulo/[slug]). */
export default function NotFound() {
    return (
        <Shell>
            <TopBar back />
            <NotFoundScreen
                heading="Não encontramos esta página"
                text="O endereço pode estar incompleto ou ter mudado."
            />
        </Shell>
    );
}
