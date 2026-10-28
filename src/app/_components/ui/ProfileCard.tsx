"use client";

import { lazy, type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import type { Profile } from "./ProfileCardPopover";

const ProfileCardPopover = lazy(() => import("./ProfileCardPopover"));

// só onde há mouse: no toque (iPhone) o cartão nunca aparece e o link só abre o perfil
export const CAN_HOVER = "(hover: hover) and (pointer: fine)";

/** Foco que abre o cartão: só o de teclado (veja InputModality), nunca o de clique. */
export function isKeyboardFocus(target: Element) {
    return target.matches(":focus-visible") && document.documentElement.dataset.input !== "pointer";
}

/**
 * Link do rodapé (children) com o cartão do perfil, que sobe no hover do mouse e no foco do
 * teclado e fecha ao sair, ao perder o foco ou na Esc. O cartão (e o motion) só é baixado quando
 * o rodapé chega perto da tela, e só em aparelho com mouse.
 */
export function ProfileCard({ profile, children }: { profile: Profile; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!matchMedia(CAN_HOVER).matches) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setNear(true);
                observer.disconnect();
            },
            { rootMargin: "50%" },
        );
        observer.observe(ref.current!);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <div
            ref={ref}
            className="relative inline-flex perspective-distant"
            onPointerEnter={(e) => near && e.pointerType === "mouse" && setOpen(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
            onFocus={(e) => near && isKeyboardFocus(e.target) && setOpen(true)}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
        >
            {children}
            {near && (
                <Suspense>
                    <ProfileCardPopover profile={profile} open={open} anchor={ref} />
                </Suspense>
            )}
        </div>
    );
}
