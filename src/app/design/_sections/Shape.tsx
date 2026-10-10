import { TokenValue } from "./live";
import { Section, Split, Subhead } from "./Section";

// As classes ficam escritas por inteiro para o Tailwind encontrá-las.
const radii = [
    { name: "pill", className: "rounded-pill", role: "Todo controle tocável" },
    { name: "panel", className: "rounded-panel", role: "Painel de vidro" },
    { name: "card", className: "rounded-card", role: "Aviso; título do skeleton" },
];

export function Shape() {
    return (
        <Section
            id="forma"
            lead="A forma diz o que se toca: pílula é controle, canto reto é imagem, texto é texto."
        >
            <Split
                aside={
                    <>
                        <p>
                            Todo controle tocável é pílula; botão só de ícone é círculo. O que não
                            se toca nunca é pílula: a nota, por exemplo, é texto.
                        </p>
                        <p>
                            Imagens de filmes e séries têm canto reto. Única exceção às regras: o
                            skeleton imita a forma do que vai substituir.
                        </p>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <Subhead>Raios</Subhead>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 desktop:grid-cols-4">
                        {radii.map((radius) => (
                            <li key={radius.name} className="flex flex-col gap-2">
                                <span
                                    className={`block h-control border border-line bg-quiet ${radius.className}`}
                                />
                                <code className="text-data font-semibold text-paper">
                                    {radius.className}
                                </code>
                                <TokenValue name={`--radius-${radius.name}`} />
                                <span className="text-caption text-soft">{radius.role}</span>
                            </li>
                        ))}
                        <li className="flex flex-col gap-2">
                            <span className="block h-control bg-frame" />
                            <code className="text-data font-semibold text-paper">imagem</code>
                            <code className="text-caption text-faint">0</code>
                            <span className="text-caption text-soft">Canto reto</span>
                        </li>
                    </ul>
                </div>
                <div className="flex flex-col gap-4">
                    <Subhead>Vidro</Subhead>
                    <div className="flex flex-col gap-2">
                        <span className="block h-24 rounded-panel border border-line bg-glass shadow-glass backdrop-blur-glass backdrop-saturate-glass" />
                        <p className="flex flex-col gap-1 text-caption text-soft">
                            <span>
                                <code className="text-paper">blur-glass</code>{" "}
                                <TokenValue name="--blur-glass" />
                                {" · "}
                                <code className="text-paper">backdrop-saturate-glass</code>{" "}
                                <TokenValue name="--backdrop-saturate-glass" />
                            </span>
                            <span>
                                <code className="text-paper">shadow-glass</code>{" "}
                                <TokenValue name="--shadow-glass" />
                            </span>
                        </p>
                    </div>
                </div>
            </Split>
        </Section>
    );
}
