import { SURPRISE_MAX_EXCLUDED } from "@/domain/surprise";
import { savedStreamings, tasteSignals, watchedTitles } from "@/infrastructure/browser-storage";

/**
 * O que o navegador leva ao criar ou entrar numa sala (RNE009): os streamings salvos, o "Já vi" e
 * os sinais de gosto. O servidor guarda isso só enquanto a sala existe.
 */
export function memberDetails() {
    return {
        streamings: savedStreamings(),
        genres: [],
        watched: watchedTitles.read().slice(-SURPRISE_MAX_EXCLUDED),
        taste: tasteSignals.read(),
    };
}
