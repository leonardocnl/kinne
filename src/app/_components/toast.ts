import { useSyncExternalStore } from "react";

// O aviso vive fora das telas para sobreviver à troca de título: "Já vi" mostra o aviso e já
// navega para a próxima opção (US005 C2).
const VISIBLE_MS = 3500;

let message = "";
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(text: string) {
    message = text;
    for (const listener of listeners) listener();
}

/** Mostra o aviso por alguns segundos; texto vazio esconde na hora. */
export function showToast(text: string) {
    clearTimeout(timer);
    set(text);
    if (text) timer = setTimeout(() => set(""), VISIBLE_MS);
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useToastMessage() {
    return useSyncExternalStore(
        subscribe,
        () => message,
        () => "",
    );
}
