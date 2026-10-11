"use client";

import { useEffect } from "react";
import { track } from "./measure";

// Uma vez por carregamento da página: trocar de tela dentro do app não é abrir de novo.
let opened = false;

/** app_opened (03): o app abriu, pela tela inicial ou por link (US001, US004). */
export function AppOpened() {
    useEffect(() => {
        if (opened) return;
        opened = true;
        track("app_opened");
    }, []);
    return null;
}
