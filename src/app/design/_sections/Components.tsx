import { Controls } from "./Controls";
import { Media } from "./Media";
import { Section, Split } from "./Section";

export function Components() {
    return (
        <Section
            id="componentes"
            lead="As peças de todas as telas, com o jeito certo e o errado de usar cada uma."
        >
            <Split
                aside={
                    <>
                        <p>
                            Os componentes ficam em <code>src/app/_components/ui/</code>. Componente
                            novo só entra se for adicionado lá e nesta página.
                        </p>
                        <p>
                            Navegue com Tab para ver o foco de verdade; a coluna “foco” mostra o
                            mesmo contorno parado.
                        </p>
                    </>
                }
            >
                <Controls />
                <Media />
            </Split>
        </Section>
    );
}
