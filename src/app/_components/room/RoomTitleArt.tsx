/**
 * O quadro da entrada da sala: só "Assistir em grupo" gigante, na largura toda, em `paper`
 * sobre o preto, centrado. Decorativo (o título de verdade é o h1 da tela); do servidor.
 */
export function RoomTitleArt() {
    return (
        <div aria-hidden="true" className="absolute inset-0 flex items-center px-gutter">
            <svg viewBox="0 0 1000 210" className="block w-full">
                <text
                    x="0"
                    y="150"
                    textLength="1000"
                    lengthAdjust="spacingAndGlyphs"
                    fontSize="196"
                    className="fill-paper font-display font-medium"
                >
                    Assistir em grupo
                </text>
            </svg>
        </div>
    );
}
