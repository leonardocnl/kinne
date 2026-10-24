"use client";

import { useState } from "react";
import { PIX } from "@/domain/pix";
import { Button } from "../_components/ui/Button";

type Status = "idle" | "copied" | "failed";

// Alternativa quando o navegador não oferece (ou nega) navigator.clipboard.
function copyWithSelection(text: string): boolean {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.className = "fixed top-0 left-0 opacity-0";
    document.body.append(field);
    field.select();
    try {
        return document.execCommand("copy");
    } catch {
        return false;
    } finally {
        field.remove();
    }
}

/** Botão "Copiar chave Pix": o aviso do resultado vai numa região de status, lida pelo leitor de tela. */
export function PixCopy() {
    const [status, setStatus] = useState<Status>("idle");

    async function copy() {
        let ok = false;
        try {
            await navigator.clipboard.writeText(PIX.key);
            ok = true;
        } catch {
            ok = copyWithSelection(PIX.key);
        }
        setStatus(ok ? "copied" : "failed");
    }

    return (
        <div className="flex flex-col items-start gap-2">
            <Button variant="primary" onClick={copy}>
                Copiar chave Pix
            </Button>
            <p role="status" className="min-h-6 text-data text-soft">
                {status === "copied" && "Chave copiada."}
                {status === "failed" && "Não deu para copiar. Selecione a chave acima e copie."}
            </p>
        </div>
    );
}
