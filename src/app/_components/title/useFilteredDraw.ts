import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { filteredRun, watchedTitles } from "@/infrastructure/browser-storage";
import { drawFiltered } from "../../_actions/filters";
import { loadError } from "../StateScreen";
import { showToast } from "../toast";
import { titleHref } from "./origin";

/**
 * Outra opção vindo dos filtros (US004 C2): sorteia outro dos mesmos 10 da rodada, sem repetir.
 * Quando acabam, `end` passa a ser quantos eram, para o estado de fim (C3).
 */
export function useFilteredDraw(currentSlug: string) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [end, setEnd] = useState<number | null>(null);

    /** `onStay` roda quando o sorteio não leva a outro título (fim das opções ou erro). */
    function draw(onStay?: () => void) {
        if (pending) return;
        startTransition(async () => {
            try {
                const run = filteredRun.read();
                // o marcado depois de abrir os filtros continua entre os 10, mas não volta (RNG004)
                const seen = [...new Set([...watchedTitles.read(), ...run.seen])];
                const { slug, total } = await drawFiltered({
                    ...run,
                    seen: seen.slice(-SURPRISE_MAX_EXCLUDED),
                });
                // "Ver de novo" pode sortear o título que já está no endereço: só sai do fim
                if (slug === currentSlug) return setEnd(null);
                // a tela que sai fica guardada pelo Next (Activity) e pode voltar: sem o fim
                if (slug)
                    return startTransition(() => {
                        setEnd(null);
                        router.replace(titleHref(slug, "filtros"));
                    });
                setEnd(total);
            } catch {
                showToast(`${loadError.heading}. Tente de novo.`);
            }
            onStay?.();
        });
    }

    /** "Ver de novo" (C3): recomeça pelos mesmos 10. */
    function again() {
        filteredRun.restart();
        draw();
    }

    return { draw, again, end, pending };
}
