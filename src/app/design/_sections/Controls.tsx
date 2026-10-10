import { Button } from "../../_components/ui/Button";
import { Frame } from "../../_components/ui/Frame";
import { PauseIcon } from "../../_components/ui/icons";
import { Chip } from "../../_components/ui/Chip";
import { GlassPanel } from "../../_components/ui/GlassPanel";
import { Slider } from "../../_components/ui/Slider";
import { TextLink } from "../../_components/ui/TextLink";
import { Wordmark } from "../../_components/ui/Wordmark";
import { CheckIcon, CloseIcon, DiceIcon } from "./icons";
import { FiltersDemo, TokenValue } from "./live";
import { DoDont, focusRing, Row, Spec, States } from "./Spec";

export function Controls() {
    return (
        <>
            <Spec
                name="Button"
                props={[
                    'variant: "primary" | "quiet" | "ghost" | "round" | "overlay"',
                    "icon?",
                    "spinIcon?",
                ]}
                does="Faz uma ação. primary é a ação principal da tela, quiet as outras, ghost fica na barra do topo, round é só ícone e overlay é um ícone pequeno sobre a imagem."
            >
                <Row label="variantes">
                    <Button variant="primary">Escolher agora</Button>
                    <Button variant="quiet">Me surpreenda</Button>
                    <Button variant="quiet" icon={<CheckIcon />}>
                        Já vi
                    </Button>
                    <Button variant="ghost">Entrar</Button>
                    <Button variant="round" aria-label="Fechar filtros">
                        <CloseIcon />
                    </Button>
                    <Button variant="round" aria-label="Outra opção" spinIcon>
                        <DiceIcon />
                    </Button>
                </Row>
                <States
                    states={["normal", "foco", "desativado"]}
                    render={(state) => (
                        <>
                            {(["primary", "quiet", "ghost"] as const).map((variant) => (
                                <Button
                                    key={variant}
                                    variant={variant}
                                    disabled={state === "desativado"}
                                    className={state === "foco" ? focusRing : undefined}
                                >
                                    {variant}
                                </Button>
                            ))}
                        </>
                    )}
                />
                <p className="text-caption text-soft">
                    Desativado: opacidade <TokenValue name="--opacity-disabled" />. No hover, todos
                    seguem o quiet; o primary não muda de cor, só encolhe ao ser pressionado.
                </p>
                <Row label="overlay sobre a imagem">
                    <Frame className="w-full">
                        <div className="absolute top-2.5 left-3 flex items-center gap-2 text-caption text-paper">
                            <Button variant="overlay" aria-label="Pausar a troca de capas">
                                <PauseIcon />
                            </Button>
                            <span>1 de 5</span>
                        </div>
                    </Frame>
                </Row>
                <p className="text-caption text-soft">
                    O overlay mede <TokenValue name="--spacing-overlay" /> para não cobrir a imagem,
                    mas o alvo de toque continua com <TokenValue name="--spacing-target" />. Fundo{" "}
                    <code>veil</code> com desfoque <TokenValue name="--blur-veil" />.
                </p>
                <Row label="ghost na barra do topo">
                    <div className="flex w-full items-center justify-between gap-4 border-b border-line pb-3">
                        <Wordmark />
                        <span className="text-data text-soft max-desktop:hidden">
                            Sexta, 9 de outubro
                        </span>
                        <Button variant="ghost">Entrar</Button>
                    </div>
                </Row>
                <DoDont
                    use={{
                        note: "um primary por tela; o resto em quiet.",
                        example: (
                            <>
                                <Button variant="primary">Escolher agora</Button>
                                <Button variant="quiet">Me surpreenda</Button>
                            </>
                        ),
                    }}
                    avoid={{
                        note: "dois botões amarelos na mesma tela.",
                        example: (
                            <>
                                <Button variant="primary">Escolher agora</Button>
                                <Button variant="primary">Me surpreenda</Button>
                            </>
                        ),
                    }}
                />
            </Spec>

            <Spec
                name="TextLink"
                props={["href?", "(sem href vira <button>)"]}
                does="Leva a outra página ou abre mais texto, sem competir com os botões."
            >
                <Row label="variantes">
                    <TextLink href="/design">
                        Ver este título <span aria-hidden="true">→</span>
                    </TextLink>
                    <TextLink aria-expanded="false">Ler mais</TextLink>
                </Row>
                <States
                    states={["normal", "foco"]}
                    render={(state) => (
                        <TextLink className={state === "foco" ? focusRing : undefined}>
                            Ler mais
                        </TextLink>
                    )}
                />
                <DoDont
                    use={{
                        note: "para navegar ou abrir texto.",
                        example: <TextLink>Ler mais</TextLink>,
                    }}
                    avoid={{
                        note: "como ação principal da tela; isso é um primary.",
                        example: (
                            <TextLink>
                                Ver recomendação <span aria-hidden="true">→</span>
                            </TextLink>
                        ),
                    }}
                />
            </Spec>

            <Spec
                name="Chip · RadioChip"
                props={["Chip: pressed: boolean", "RadioChip: name, value, checked"]}
                does="Marca opções de filtro: Chip para várias (aria-pressed), RadioChip para uma só (rádio nativo, setas do teclado)."
            >
                <States
                    states={["normal", "foco", "marcado"]}
                    render={(state) => (
                        <Chip
                            pressed={state === "marcado"}
                            className={state === "foco" ? focusRing : undefined}
                        >
                            Max
                        </Chip>
                    )}
                />
                <DoDont
                    use={{
                        note: "marcado em paper; o chip marcado não muda no hover.",
                        example: (
                            <>
                                <Chip pressed>Netflix</Chip>
                                <Chip pressed={false}>Max</Chip>
                            </>
                        ),
                    }}
                    avoid={{
                        note: "marcado em amarelo: o amarelo é só do controle principal.",
                        example: (
                            <>
                                <span className="inline-flex h-target items-center rounded-pill bg-signal px-3.75 text-small text-ink">
                                    Netflix
                                </span>
                                <Chip pressed={false}>Max</Chip>
                            </>
                        ),
                    }}
                />
            </Spec>

            <Spec
                name="GlassPanel · Slider"
                props={["GlassPanel: <div>", "Slider: label, value, min, max, valueText"]}
                does="O painel de vidro reúne os filtros sobre a imagem; o slider escolhe um número com o valor escrito ao lado. No celular o painel ocupa a tela."
            >
                <div className="relative bg-frame p-4 max-desktop:-mx-gutter max-desktop:p-0">
                    <FiltersDemo />
                </div>
                <DoDont
                    use={{
                        note: "valor escrito como a pessoa fala.",
                        example: (
                            <Slider
                                className="w-full"
                                label="Duração do filme"
                                min={0}
                                max={3}
                                value={2}
                                valueText="até 2h"
                                readOnly
                            />
                        ),
                    }}
                    avoid={{
                        note: "o número cru do controle, que não diz nada.",
                        example: (
                            <Slider
                                className="w-full"
                                label="Duração do filme"
                                min={0}
                                max={3}
                                value={2}
                                valueText="2"
                                readOnly
                            />
                        ),
                    }}
                />
                <DoDont
                    use={{
                        note: "um painel por vez, sobre o quadro.",
                        example: (
                            <GlassPanel className="w-full">
                                <span className="text-data text-soft">Filtros</span>
                            </GlassPanel>
                        ),
                    }}
                    avoid={{
                        note: "painel dentro de painel.",
                        example: (
                            <GlassPanel className="w-full">
                                <GlassPanel>
                                    <span className="text-data text-soft">Filtros</span>
                                </GlassPanel>
                            </GlassPanel>
                        ),
                    }}
                />
            </Spec>
        </>
    );
}
