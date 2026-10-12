import { useEffect, useRef, useSyncExternalStore } from "react";
import { filtersOnArrival } from "@/infrastructure/browser-storage";

// O painel aberto vive no histórico da aba (history.state), nunca na URL (security §8): o
// "voltar" fecha o painel (C5) e recarregar a página o mantém aberto. Os valores ficam no
// navegador (RNG005). Só abre depois da hidratação, porque os valores salvos não existem no
// servidor.
const OPEN_KEY = "kinneFilters";
const CHANGE = "kinne:filters-route";

const isOpen = () => window.history.state?.[OPEN_KEY] === true;

function subscribe(onChange: () => void) {
    window.addEventListener("popstate", onChange);
    window.addEventListener(CHANGE, onChange);
    return () => {
        window.removeEventListener("popstate", onChange);
        window.removeEventListener(CHANGE, onChange);
    };
}

function setOpen(open: boolean, mode: "push" | "replace") {
    const state = { ...window.history.state, [OPEN_KEY]: open };
    if (mode === "push") window.history.pushState(state, "");
    else window.history.replaceState(state, "");
    window.dispatchEvent(new Event(CHANGE));
}

export function useFiltersRoute() {
    const open = useSyncExternalStore(subscribe, isOpen, () => false);
    // aberto por aqui: fechar é voltar. Aberto por "Mudar filtros" ou recarregando: fechar só
    // tira a marca
    const pushed = useRef(false);

    useEffect(() => {
        if (filtersOnArrival.take()) setOpen(true, "replace");
    }, []);

    return {
        open,
        show() {
            pushed.current = true;
            setOpen(true, "push");
        },
        hide() {
            if (pushed.current) window.history.back();
            else setOpen(false, "replace");
            pushed.current = false;
        },
    };
}
