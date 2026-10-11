import type { EventName, RecommendationSource } from "@/domain/usage-events";
import { browserId, teamBrowser } from "@/infrastructure/browser-storage";
import { recordEvent } from "../_actions/events";

type Details = { source?: RecommendationSource | null; titleId?: number | null };

/**
 * Envia um evento da medição (03). O navegador da equipe não envia nada (US006 C2), e uma falha
 * ao enviar nunca chega à tela.
 */
export function track(name: EventName, { source = null, titleId = null }: Details = {}) {
    try {
        if (teamBrowser.is()) return;
        recordEvent({ browserId: browserId(), name, source, titleId }).catch(() => {});
    } catch {
        // sem crypto.randomUUID (navegador antigo, página sem HTTPS), a visita só não é contada
    }
}
