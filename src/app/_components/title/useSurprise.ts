import { useRouter } from "next/navigation";
import { isLimited, LIMITED_MESSAGE } from "@/domain/rate-limit";
import { useTransition } from "react";
import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import {
    savedStreamings,
    shownTitles,
    tasteSignals,
    watchedTitles,
} from "@/infrastructure/browser-storage";
import { surprise } from "../../_actions/surprise";
import { loadError } from "../StateScreen";
import { showToast } from "../toast";
import { wipeRouter } from "../ui/wipe";
import { goToTitle } from "./origin";

/**
 * Me surpreenda (US003): sorteia no servidor com o que o navegador guarda e abre o título com
 * origem "surpresa". Da tela inicial, empilha (push); da tela do título, troca (replace), para o
 * "voltar" do navegador levar à tela inicial (US004 C7).
 */
export function useSurprise(mode: "push" | "replace") {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    /** `onStay` roda quando o sorteio não leva a outro título (nada a sortear ou erro). */
    function draw(onStay?: () => void) {
        if (pending) return;
        startTransition(async () => {
            try {
                const answer = await surprise({
                    streamings: savedStreamings(),
                    watched: watchedTitles.read().slice(-SURPRISE_MAX_EXCLUDED),
                    shown: shownTitles.read().slice(-SURPRISE_MAX_EXCLUDED),
                    taste: tasteSignals.read(),
                });
                // passou do limite de pedidos (security.md §7): o aviso próprio, e a tela fica
                if (isLimited(answer)) {
                    showToast(LIMITED_MESSAGE);
                    return onStay?.();
                }
                const slug = answer;
                if (slug)
                    return goToTitle(
                        // da tela do título, de um título para outro: pela cortina
                        mode === "replace" ? wipeRouter(router) : router,
                        mode,
                        slug,
                        "surpresa",
                    );
                showToast("Você já marcou todos os títulos que a surpresa sorteia.");
            } catch {
                showToast(`${loadError.heading}. Tente de novo.`);
            }
            onStay?.();
        });
    }

    return { draw, pending };
}
