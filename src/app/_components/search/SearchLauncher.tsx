"use client";

import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { SearchIcon } from "../ui/icons";

// H9: o painel só é baixado quando a pessoa chega perto do botão.
const loadPanel = () => import("./SearchPanel");
const SearchPanel = lazy(loadPanel);
const preload = () => void loadPanel();

/** Botão de busca da barra do topo: "Buscar" no computador, só a lupa no celular. */
export function SearchLauncher() {
    const [open, setOpen] = useState(false);
    // o que a pessoa digita enquanto o painel ainda está chegando
    const [early, setEarly] = useState("");
    const opener = useRef<HTMLButtonElement | null>(null);

    function show(event: { currentTarget: HTMLButtonElement }) {
        opener.current = event.currentTarget;
        setEarly("");
        setOpen(true);
    }

    function close(returnFocus: boolean) {
        setOpen(false);
        if (returnFocus) opener.current?.focus();
    }

    const shared = {
        onPointerEnter: preload,
        onFocus: preload,
        onClick: show,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
    } as const;

    return (
        <div className="relative">
            <Button
                variant="ghost"
                icon={<SearchIcon />}
                className="max-desktop:hidden"
                {...shared}
            >
                Buscar
            </Button>
            <Button
                variant="round"
                aria-label="Buscar filme ou série"
                className="desktop:hidden"
                {...shared}
            >
                <SearchIcon />
            </Button>
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
        </div>
    );
}
