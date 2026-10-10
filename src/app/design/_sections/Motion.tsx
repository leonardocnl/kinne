import { Skeleton } from "../../_components/ui/Skeleton";
import { MotionDemo, TokenValue } from "./live";
import { Section, Split, Subhead } from "./Section";

const durations = [
    { name: "hover", className: "duration-hover", role: "Hover e giro do ícone" },
    { name: "fade", className: "duration-fade", role: "Textos e aviso aparecendo" },
    { name: "panel", className: "duration-panel", role: "Painel de filtros entrando" },
    { name: "dissolve", className: "duration-dissolve", role: "Troca de imagem" },
];

export function Motion() {
    return (
        <Section
            id="movimento"
            lead="Movimento curto que assenta devagar, e nenhum para quem pediu menos movimento."
        >
            <Split
                aside={
                    <>
                        <p>
                            Tudo usa a mesma curva, <code>ease-settle</code> (
                            <TokenValue name="--ease-settle" />
                            ): sai rápido e chega macio.
                        </p>
                        <p>
                            Com <code>prefers-reduced-motion</code>, nada se move nem pulsa (
                            <code>motion-reduce:</code>). Ative no sistema para ver a demonstração
                            parada.
                        </p>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <Subhead>Durações</Subhead>
                    <MotionDemo items={durations} />
                </div>
                <div className="flex flex-col gap-4">
                    <Subhead>Pulso do carregamento</Subhead>
                    <Skeleton shape="line" className="w-full max-w-80" />
                    <p className="flex flex-wrap gap-x-3 text-caption">
                        <code className="font-semibold text-paper">animate-breathe</code>
                        <TokenValue name="--animate-breathe" />
                    </p>
                </div>
            </Split>
        </Section>
    );
}
