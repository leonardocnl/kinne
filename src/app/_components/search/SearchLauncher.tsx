"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { SearchIcon } from "../ui/icons";

// H9: o painel só é baixado quando a pessoa chega perto do botão.
const loadPanel = () => import("./SearchPanel");
const SearchPanel = lazy(loadPanel);
const preload = () => void loadPanel();

/**
 * "Buscar", a última parte da navbar. Abre a busca no próprio chip (computador) ou em tela cheia
 * (celular); não é uma página, então não acende a luz. `className` vem da Navbar (servidor): as
 * classes vão no HTML, não no JS da home.
 */
export function SearchLauncher({ className }: { className: string }) {
    const [open, setOpen] = useState(false);
    // o que a pessoa digita enquanto o painel ainda está chegando
    const [early, setEarly] = useState("");
    const button = useRef<HTMLButtonElement>(null);

    function show() {
        setEarly("");
        setOpen(true);
    }

    function close(returnFocus: boolean) {
        setOpen(false);
        if (returnFocus) button.current?.focus();
    }

    return (
        <>
            <button
                ref={button}
                type="button"
                onPointerEnter={preload}
                onFocus={preload}
                onClick={show}
                aria-haspopup="dialog"
                aria-expanded={open}
                className={className}
            >
                <SearchIcon />
                Buscar
            </button>
            {open && (
                <Suspense
                    fallback={
                        <input
                            autoFocus
                            aria-label="Nome do filme ou série"
                            autoComplete="off"
                            value={early}
                            onChange={(event) => setEarly(event.target.value)}
                            className="sr-only"
                        />
                    }
                >
                    <SearchPanel initialTerm={early} onClose={close} />
                </Suspense>
            )}
        </>
    );
}
