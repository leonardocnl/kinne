import { streamingList } from "@/domain/streaming";
import type { HomePick } from "../../_data/home";
import { TitleSpec } from "../ui/TitleSpec";

/**
 * Ficha do destaque da home, a mesma da tela do título sem direção nem elenco (US001 C1): onde
 * assistir, gênero, ano e duração. Feita no servidor, fora do JS da home.
 */
export function PickSpecs({ pick }: { pick: HomePick }) {
    return (
        <dl className="flex flex-wrap gap-x-8 gap-y-4">
            {pick.streamings.length > 0 && (
                <TitleSpec label="Onde assistir">
                    <span className="font-medium">{streamingList(pick.streamings)}</span>
                </TitleSpec>
            )}
            <TitleSpec label="Gênero">{pick.genre}</TitleSpec>
            {pick.year && <TitleSpec label="Ano">{pick.year}</TitleSpec>}
            {pick.runtime && <TitleSpec label="Duração">{pick.runtime}</TitleSpec>}
        </dl>
    );
}
