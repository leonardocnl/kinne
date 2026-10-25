import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { wireFilters } from "@/domain/filters";
import type { RoundEnd } from "@/domain/rounds";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { filteredRun, tasteSignals, watchedTitles } from "@/infrastructure/browser-storage";
import { drawFiltered } from "../../_actions/filters";
import { loadError } from "../StateScreen";
import { showToast } from "../toast";
import { goToTitle } from "./origin";

/**
 * Outra opção vindo dos filtros (US004 C2): sorteia outro da mesma rodada de 10, sem repetir.
 * Quando a rodada acaba, `end` diz o que vem depois (a rodada seguinte ou o fim), para o estado
 * de fim (C3).
 */
export function useFilteredDraw(currentSlug: string) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [end, setEnd] = useState<RoundEnd | null>(null);

    /** `onStay` roda quando o sorteio não leva a outro título (fim das opções ou erro). */
    function draw(onStay?: () => void) {
        if (pending) return;
        startTransition(async () => {
            try {
                const run = filteredRun.read();
                // o marcado depois de abrir os filtros continua entre os 10, mas não volta (RNG004)
                const seen = [...new Set([...watchedTitles.read(), ...run.seen])];
                const answer = await drawFiltered({
                    filters: wireFilters(run.filters),
                    watched: run.watched,
                    seen: seen.slice(-SURPRISE_MAX_EXCLUDED),
                    // o gosto de agora, não o de quando a sequência começou (US009 C2)
                    taste: tasteSignals.read(),
                    round: run.round,
                });
                const slug = answer.slug;
                // "Recomeçar" pode sortear o título que já está no endereço: só sai do fim
                if (slug === currentSlug) return setEnd(null);
                // a tela que sai fica guardada pelo Next (Activity) e pode voltar: sem o fim
                if (slug)
                    return startTransition(() => {
                        setEnd(null);
                        goToTitle(router, "replace", slug, "filtros");
                    });
                setEnd(answer.end);
            } catch {
                showToast(`${loadError.heading}. Tente de novo.`);
            }
            onStay?.();
        });
    }

    /** "Sortear entre os próximos 10" (C3): a rodada seguinte. */
    function nextRound() {
        filteredRun.advance();
        draw();
    }

    /** "Recomeçar" (C3): da primeira rodada, sem os já mostrados contarem. */
    function again() {
        filteredRun.restart();
        draw();
    }

    return { draw, nextRound, again, end, pending };
}
