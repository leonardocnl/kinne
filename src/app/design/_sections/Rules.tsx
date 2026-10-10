import { designDoc } from "./design-doc";
import { Section, Split, Subhead } from "./Section";

/** Texto do DESIGN.md com `código` em fonte de código. */
function Inline({ text }: { text: string }) {
    return text.split("`").map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

export function Rules() {
    return (
        <Section
            id="regras"
            lead="O resumo do DESIGN.md, lido do próprio arquivo: se ele muda, esta seção muda junto."
        >
            <Split
                aside={
                    <>
                        <p>
                            Leitura obrigatória antes de qualquer tarefa de interface. A fonte da
                            verdade visual é a maquete aprovada.
                        </p>
                        <p>Última atualização: {designDoc.updated}.</p>
                    </>
                }
            >
                {designDoc.sections.map((section) => (
                    <div key={section.title} className="flex flex-col gap-3">
                        <Subhead>{section.title}</Subhead>
                        {section.lines
                            .filter((line) => !line.bullet)
                            .map((line) => (
                                <p key={line.text} className="max-w-measure text-small">
                                    <Inline text={line.text} />
                                </p>
                            ))}
                        <ul className="flex max-w-measure list-disc flex-col gap-2 pl-5 text-small text-soft marker:text-faint">
                            {section.lines
                                .filter((line) => line.bullet)
                                .map((line) => (
                                    <li key={line.text}>
                                        <Inline text={line.text} />
                                    </li>
                                ))}
                        </ul>
                    </div>
                ))}
            </Split>
        </Section>
    );
}
