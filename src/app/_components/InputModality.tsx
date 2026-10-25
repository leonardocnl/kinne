"use client";

import { useEffect } from "react";

/**
 * Marca no <html> como a pessoa está navegando (data-input), para o globals.css mostrar o anel de
 * foco só no teclado. Campos de texto casam :focus-visible até no clique; só Tab troca para o
 * teclado, para digitar depois de clicar não acender o anel.
 */
export function InputModality() {
    useEffect(() => {
        const root = document.documentElement;
        const pointer = () => (root.dataset.input = "pointer");
        const keyboard = (event: KeyboardEvent) => {
            if (event.key === "Tab") root.dataset.input = "keyboard";
        };
        document.addEventListener("pointerdown", pointer, true);
        document.addEventListener("keydown", keyboard, true);
        return () => {
            document.removeEventListener("pointerdown", pointer, true);
            document.removeEventListener("keydown", keyboard, true);
            delete root.dataset.input;
        };
    }, []);
    return null;
}
