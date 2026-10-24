import { clearAccountKeys } from "@/infrastructure/browser-storage";
import { loadAccountStatus } from "./store";

/**
 * Depois de entrar: o navegador apaga o que já foi para a conta (US015 C1) e a tela passa a ler a
 * conta. A ordem importa: só apaga depois de a conta ter aceitado (verifyCode devolveu ok).
 */
export async function clearAccountKeysAndLoad() {
    clearAccountKeys();
    await loadAccountStatus(true);
}
