"use client";

import { Toast } from "./ui/Toast";
import { useToastMessage } from "./toast";

/** O aviso da página: embaixo, ao centro; no celular, logo acima da barra presa à base. */
export function ToastHost() {
    return (
        <div className="pointer-events-none fixed inset-x-4 bottom-toast z-20 flex justify-center">
            <Toast message={useToastMessage()} />
        </div>
    );
}
