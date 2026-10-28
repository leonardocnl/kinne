/**
 * Feixe de projetor no quadro da entrada da sala: a luz amarela abre do alto, no centro, como a
 * de uma sala de cinema, tremula de leve e leva poeira (o granulado do site) subindo devagar
 * dentro dela. Só CSS, do servidor: opacity e transform animam; com movimento reduzido fica
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
                {/* poeira: o granulado, com o dobro da altura, sobe meia volta e emenda */}
                <div className="absolute inset-x-0 top-0 -bottom-full animate-dust bg-grain opacity-grain mix-blend-overlay motion-reduce:animate-none" />
            </div>
        </div>
    );
}
