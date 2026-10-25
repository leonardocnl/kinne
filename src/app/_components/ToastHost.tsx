"use client";

import { markSignal } from "./account/marks";
import { showAnswered, useToast } from "./toast";
import { Button } from "./ui/Button";
import { Toast } from "./ui/Toast";

/**
 * O aviso da página: embaixo, ao centro; no celular, logo acima da barra presa à base. Depois de
 * "Já vi", traz a pergunta "Curtiu?" (US010): discreta, sem a cor de destaque (C4).
 */
export function ToastHost() {
    const { text, asking } = useToast();

    function answer(signal: "liked" | "disliked") {
        if (asking === null) return;
        // com a conta aberta grava na conta, sem ela no navegador (US015 C2); a resposta vale já
        void markSignal(asking, signal);
        showAnswered();
    }

    return (
        <div className="pointer-events-none fixed inset-x-4 bottom-toast z-20 flex justify-center">
            <Toast message={text} className={asking === null ? undefined : "pointer-events-auto"}>
                {asking !== null && (
                    <>
                        <span className="font-medium">Curtiu?</span>
                        <Button variant="round" aria-label="Curti" onClick={() => answer("liked")}>
                            <span aria-hidden="true">👍</span>
                        </Button>
                        <Button
                            variant="round"
                            aria-label="Não curti"
                            onClick={() => answer("disliked")}
                        >
                            <span aria-hidden="true">👎</span>
                        </Button>
                    </>
                )}
            </Toast>
        </div>
    );
}
