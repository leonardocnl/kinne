import { ColorSwatch } from "./live";
import { Section, Split, Subhead } from "./Section";

// As classes ficam escritas por inteiro para o Tailwind encontrá-las.
const groups = [
    {
        title: "Texto e destaque",
        colors: [
            { name: "ink", className: "bg-ink", role: "Fundo" },
            { name: "paper", className: "bg-paper", role: "Texto" },
            { name: "signal", className: "bg-signal", role: "Controle principal e ícone da marca" },
            { name: "soft", className: "bg-soft", role: "Texto secundário" },
            { name: "faint", className: "bg-faint", role: "Texto apagado" },
        ],
    },
    {
        title: "Superfícies",
        colors: [
            { name: "chip", className: "bg-chip", role: "Fundo do chip" },
            { name: "ghost", className: "bg-ghost", role: "Botão ghost, brilho do skeleton" },
            { name: "quiet", className: "bg-quiet", role: "Vidro dos botões quiet e round" },
            { name: "glass", className: "bg-glass", role: "Painel de vidro" },
            { name: "hover", className: "bg-hover", role: "Fundo no hover" },
            { name: "frame", className: "bg-frame", role: "Quadro sem imagem" },
            { name: "toast", className: "bg-toast", role: "Aviso" },
            { name: "scrim", className: "bg-scrim", role: "Tinta do painel (computador)" },
            {
                name: "scrim-strong",
                className: "bg-scrim-strong",
                role: "Tinta do painel (celular)",
            },
            { name: "nav", className: "bg-nav", role: "Vidro escuro da navbar" },
            { name: "veil", className: "bg-veil", role: "Botão overlay sobre a imagem" },
        ],
    },
    {
        title: "Linhas",
        colors: [
            { name: "line", className: "bg-line", role: "Bordas e divisórias" },
            { name: "line-strong", className: "bg-line-strong", role: "Borda no hover" },
            { name: "halo", className: "bg-halo", role: "Anel do slider" },
            { name: "rail", className: "bg-rail", role: "Barra de progresso" },
            { name: "track", className: "bg-track", role: "Trilho do slider" },
        ],
    },
];

export function Colors() {
    return (
        <Section
            id="cores"
            lead="Um fundo quase preto, um texto quase branco e um só amarelo, para o olho saber onde agir."
        >
            <Split
                aside={
                    <>
                        <p>
                            O amarelo <code>signal</code> aparece só no controle mais importante de
                            cada tela e no ícone da marca. O resto é tinta clara sobre preto, em
                            camadas translúcidas.
                        </p>
                        <p>
                            O contraste é medido sobre <code>ink</code>, já misturando a
                            transparência. Texto pede AAA (7:1); abaixo de AA (4,5:1) a cor só serve
                            para superfícies e linhas.
                        </p>
                    </>
                }
            >
                {groups.map((group) => (
                    <div key={group.title} className="flex flex-col gap-4">
                        <Subhead>{group.title}</Subhead>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 desktop:grid-cols-3">
                            {group.colors.map((color) => (
                                <ColorSwatch key={color.name} {...color} />
                            ))}
                        </ul>
                    </div>
                ))}
            </Split>
        </Section>
    );
}
