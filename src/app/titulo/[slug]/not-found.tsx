import { StateScreen } from "../../_components/StateScreen";
import { AsciiArt } from "../../_components/ui/AsciiArt";
import { ButtonLink } from "../../_components/ui/Button";

/** Título que não existe ou saiu do catálogo; a barra do topo e o rodapé vêm do layout. */
export default function TitleNotFound() {
    return (
        <StateScreen
            heading="Não encontramos este título"
            text="Ele pode ter saído do catálogo, ou o endereço está incompleto."
            art={<AsciiArt text="404" tone="signal" drift className="absolute inset-0 size-full" />}
            action={
                <ButtonLink variant="primary" href="/">
                    Voltar ao início
                </ButtonLink>
            }
        />
    );
}
