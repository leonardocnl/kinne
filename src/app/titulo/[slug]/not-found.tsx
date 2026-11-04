import { NotFoundScreen } from "../../_components/NotFoundScreen";

/** Título que não existe ou saiu do catálogo; a barra do topo e o rodapé vêm do layout. */
export default function TitleNotFound() {
    return (
        <NotFoundScreen
            heading="Não encontramos este título"
            text="Ele pode ter saído do catálogo, ou o endereço está incompleto."
        />
    );
}
