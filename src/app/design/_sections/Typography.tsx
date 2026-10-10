import { TokenValue, TypeSpecimen } from "./live";
import { display, Section, Split, Subhead } from "./Section";

const titles = [
    { name: "title", className: `${display} text-title`, sample: "O Grande Hotel Budapeste" },
    { name: "heading", className: `${display} text-heading`, sample: "O que você quer ver hoje?" },
    {
        name: "confirm",
        className: `${display} text-confirm`,
        sample: "Combinado. Está na Netflix.",
    },
    { name: "score", className: `${display} text-score`, sample: "8,0" },
    { name: "count", className: `${display} text-count`, sample: "248" },
    { name: "reel", className: `${display} text-reel`, sample: "Hoje" },
    { name: "shot", className: `${display} text-shot`, sample: "La La Land" },
];

const uiStyles = [
    {
        name: "tagline",
        className: "text-tagline text-soft",
        sample: "Um concierge lendário e seu jovem mensageiro viram suspeitos do roubo de um quadro.",
    },
    {
        name: "synopsis",
        className: "max-w-measure text-synopsis text-soft",
        sample: "Nos anos 1930, Gustave H., o concierge impecável de um hotel famoso nos Alpes, é acusado de matar uma hóspede rica que deixou para ele um quadro valioso.",
    },
    { name: "body", className: "text-body", sample: "Me surpreenda" },
    { name: "small", className: "text-small", sample: "Ver este título →" },
    { name: "data", className: "text-data text-soft", sample: "Comédia · 2014 · 1h 40min" },
    {
        name: "caption",
        className: "text-caption text-faint",
        sample: "Dados de filmes e séries: TMDB",
    },
    {
        name: "footnote",
        className: "text-footnote text-faint",
        sample: "O Kinne conta visitas sem identificar quem você é.",
    },
];

export function Typography() {
    return (
        <Section
            id="tipografia"
            lead="Duas fontes: uma condensada e elegante para títulos e números, uma neutra para ler e agir."
        >
            <Split
                aside={
                    <>
                        <p>
                            Darker Grotesque, peso 500, em títulos, notas e contagens. Manrope em
                            todo o resto: texto, botões, rótulos.
                        </p>
                        <p>
                            Cada linha mostra um texto real do Kinne no tamanho real. A ficha é
                            medida no próprio texto: fonte · tamanho · altura de linha ·
                            espaçamento. Alguns tamanhos mudam no celular.
                        </p>
                        <p className="text-caption tracking-code uppercase">Erro de conexão</p>
                        <p>
                            Códigos de estado, em caixa alta: <code>tracking-code</code>{" "}
                            <TokenValue name="--tracking-code" />. “TMDB” ao lado da nota:{" "}
                            <code>tracking-score</code> <TokenValue name="--tracking-score" />.
                        </p>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <Subhead>Títulos e números</Subhead>
                    <ul className="flex flex-col gap-6">
                        {titles.map((item) => (
                            <TypeSpecimen key={item.name} {...item} />
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col gap-4">
                    <Subhead>Interface</Subhead>
                    <ul className="flex flex-col gap-6">
                        {uiStyles.map((item) => (
                            <TypeSpecimen key={item.name} {...item} />
                        ))}
                    </ul>
                </div>
            </Split>
        </Section>
    );
}
