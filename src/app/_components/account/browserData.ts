import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { savedStreamings, tasteSignals, watchedTitles } from "@/infrastructure/browser-storage";

/** O que o navegador tinha e vai para a conta ao entrar (US015 C1): gosto, "Já vi" e streamings. */
export function browserData() {
    return {
        streamings: savedStreamings(),
        watched: watchedTitles.read().slice(-SURPRISE_MAX_EXCLUDED),
        taste: tasteSignals.read(),
    };
}
