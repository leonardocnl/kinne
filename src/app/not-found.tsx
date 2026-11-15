import { NotFoundScreen } from "@/shared/ui/NotFoundScreen";
import { Shell } from "./_shell/Shell";
import { TopBar } from "./_shell/TopBar";

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
