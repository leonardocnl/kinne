/**
 * Feixe de projetor no quadro da entrada da sala: a luz amarela abre do alto, no centro, como a
 * de uma sala de cinema, e tremula de leve.
 * Só CSS, do servidor: só a opacity anima; com movimento reduzido fica
 * parado. Decorativo: ocupa a caixa de quem usa.
 */
export function ProjectorBeam({ className }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none overflow-hidden ${className ?? ""}`}
        >
            <div className="absolute inset-0 mask-beam">
                <div className="absolute inset-0 animate-beam-flicker bg-beam motion-reduce:animate-none" />
            </div>
        </div>
    );
}
