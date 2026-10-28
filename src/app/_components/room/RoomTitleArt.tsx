import { AsciiHorizon } from "../ui/AsciiHorizon";

/**
 * O quadro da entrada da sala na linguagem do rodapé: o horizonte amarelo nascendo no pé e
 * "Assistir em grupo" gigante em preto, na largura toda, com a base cortada, contra a luz.
 * Decorativo (o título de verdade é o h1 da tela); feito no servidor.
 */
export function RoomTitleArt() {
    return (
        <div aria-hidden="true" className="absolute inset-0">
            <AsciiHorizon className="absolute inset-0" />
            <svg viewBox="0 0 1000 150" className="absolute inset-x-0 bottom-0 block w-full">
                <text
                    x="0"
                    y="168"
                    textLength="1000"
                    lengthAdjust="spacingAndGlyphs"
                    fontSize="196"
                    className="fill-ink font-display font-medium"
                >
                    Assistir em grupo
                </text>
            </svg>
        </div>
    );
}
