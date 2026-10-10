import Image from "next/image";
import type { ReactNode } from "react";
import { cx } from "./cx";

type FrameProps = {
    /** imagem do filme ou série; decorativa, porque o título está no texto ao lado */
    src?: string;
    /** escurece também a base, para a nota e o trailer ficarem legíveis */
    bottomShade?: boolean;
    /** conteúdo sobreposto (nota, trailer, voltar) */
    children?: ReactNode;
    className?: string;
};

/**
 * Quadro da imagem: cantos retos, 2.39:1 no computador e 16:9 no celular (de ponta a ponta da
 * tela), com gradiente e grão por cima da imagem.
 */
export function Frame({ src, bottomShade, children, className }: FrameProps) {
    return (
        <div
            className={cx(
                "relative isolate aspect-video overflow-hidden bg-frame max-desktop:-mx-gutter desktop:aspect-scope",
                className,
            )}
        >
            {src && (
                <Image
                    src={src}
                    alt=""
                    fill
                    sizes="100vw"
                    className="-z-3 object-cover object-focus"
                />
            )}
            <div
                aria-hidden="true"
                className={cx(
                    "absolute inset-0 -z-2",
                    bottomShade ? "bg-shade-full" : "bg-shade-top",
                )}
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-1 bg-grain opacity-grain mix-blend-overlay"
            />
            {children}
        </div>
    );
}
