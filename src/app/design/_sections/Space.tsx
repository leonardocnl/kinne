import { Measure, TokenValue } from "./live";
import { Section, Split, Subhead } from "./Section";

// As classes ficam escritas por inteiro para o Tailwind encontrá-las.
const steps = [
    { times: 1, className: "w-1" },
    { times: 2, className: "w-2" },
    { times: 3, className: "w-3" },
    { times: 4, className: "w-4" },
    { times: 5, className: "w-5" },
    { times: 6, className: "w-6" },
    { times: 8, className: "w-8" },
    { times: 10, className: "w-10" },
    { times: 14, className: "w-14" },
];

const named = [
    { label: "target", className: "w-target", token: "--spacing-target", note: "Alvo de toque" },
    { label: "control", className: "w-control", token: "--spacing-control", note: "Botões" },
    { label: "gutter", className: "w-gutter", token: "--spacing-gutter", note: "Margem lateral" },
    {
        label: "skeleton-title",
        className: "w-skeleton-title",
        token: "--spacing-skeleton-title",
        note: "Título do skeleton",
    },
    {
        label: "filters",
        className: "w-filters",
        token: "--container-filters",
        note: "Painel de filtros",
    },
    {
        label: "measure",
        className: "w-measure",
        token: "--container-measure",
        note: "Texto corrido, até 80 caracteres",
    },
];

export function Space() {
    return (
        <Section
            id="espaco"
            lead="Uma régua só para distâncias e tamanhos, para tudo se alinhar sem negociar pixel."
        >
            <Split
                aside={
                    <>
                        <p>
                            Toda distância é múltiplo de <code>--spacing</code> (
                            <TokenValue name="--spacing" />
                            ): <code>p-1</code>, <code>gap-3.5</code>, <code>px-5.5</code>.
                        </p>
                        <p>
                            Os tamanhos com nome resolvem o toque, os controles e a leitura. Cada
                            barra está em escala real, com o valor do token e a largura medida.
                        </p>
                        <p>
                            A página vai até <code>page</code> (
                            <TokenValue name="--container-page" />
                            ).
                        </p>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <Subhead>Escala</Subhead>
                    <ul className="flex flex-col gap-3">
                        {steps.map((step) => (
                            <Measure
                                key={step.times}
                                label={step.className}
                                token="--spacing"
                                times={step.times}
                                className={step.className}
                            />
                        ))}
                    </ul>
                </div>
                <div className="flex flex-col gap-4">
                    <Subhead>Tamanhos com nome</Subhead>
                    <ul className="flex flex-col gap-4">
                        {named.map((item) => (
                            <Measure key={item.label} {...item} />
                        ))}
                    </ul>
                </div>
            </Split>
        </Section>
    );
}
