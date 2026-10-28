import { Button, ButtonLink } from "../../_components/ui/Button";
import { Dock } from "../../_components/ui/Dock";
import { Availability } from "../../_components/ui/Availability";
import { Fact, Facts } from "../../_components/ui/Facts";
import { availableStreamings, STREAMING_SERVICES } from "@/domain/streaming";
import { Frame } from "../../_components/ui/Frame";
import {
    BackIcon,
    CheckIcon,
    CloseIcon,
    DiceIcon,
    PauseIcon,
    SearchIcon,
} from "../../_components/ui/icons";
import { Chip } from "../../_components/ui/Chip";
import { GlassPanel } from "../../_components/ui/GlassPanel";
import { Navbar } from "../../_components/ui/Navbar";
import { Slider } from "../../_components/ui/Slider";
import { TextLink } from "../../_components/ui/TextLink";
import { FiltersDemo, RemovableChipDemo, TokenValue } from "./live";
import { DoDont, focusRing, Row, Spec, States } from "./Spec";

export function Controls() {
    return (
        <>
            <Spec
                name="Button · ButtonLink"
                props={[
                    'variant: "primary" | "quiet" | "ghost" | "round" | "overlay"',
                    "icon?",
                    "spinIcon?",
                    "ButtonLink: href",
                ]}
                does="Faz uma ação. primary é a ação principal da tela, quiet as outras, ghost fica na barra do topo, round é só ícone e overlay é um ícone pequeno sobre a imagem. ButtonLink tem a mesma cara, mas leva a outra página."
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
                    <Button variant="ghost" icon={<SearchIcon />}>
                        Buscar
                    </Button>
                    <Button variant="round" aria-label="Buscar filme ou série">
                        <SearchIcon />
                    </Button>
                </Row>
                <Row label="ButtonLink: leva a outra página">
                    <ButtonLink variant="primary" href="/">
                        Voltar ao início
                    </ButtonLink>
                    <ButtonLink variant="ghost" href="/" icon={<span aria-hidden="true">←</span>}>
                        Voltar
                    </ButtonLink>
                    <ButtonLink variant="round" href="/" aria-label="Voltar ao início">
                        <BackIcon />
                    </ButtonLink>
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
                        <span className="text-data text-soft">Kinne</span>
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
                name="Dock"
                props={["tall?", "(div)"]}
                does="Prende as ações à base da tela no celular, acima da área segura do aparelho, com um degradê por cima do texto que passa embaixo. No computador fica no lugar. Enquanto existe, a página ganha espaço embaixo e scroll-padding, para a barra não esconder o foco (WCAG 2.4.11)."
            >
                <Row label="no celular, presa à base (aqui solta para caber na página)">
                    <Dock className="w-full max-desktop:static">
                        <div className="flex gap-2.5">
                            <Button variant="primary" className="min-w-0 flex-1">
                                Vou assistir
                            </Button>
                            <Button variant="quiet" icon={<CheckIcon />}>
                                Já vi
                            </Button>
                            <Button variant="round" aria-label="Outra opção" spinIcon>
                                <DiceIcon />
                            </Button>
                        </div>
                    </Dock>
                </Row>
                <p className="text-caption text-soft">
                    Espaço embaixo da página: <TokenValue name="--spacing-dock" />; com{" "}
                    <code>tall</code>, para “Combinado” e o botão,{" "}
                    <TokenValue name="--spacing-dock-tall" />.
                </p>
            </Spec>

            <Spec
                name="Navbar"
                props={['current: "inicio" | "sobre"']}
                does="Chip de vidro escuro com as abas Início e Sobre, no topo no computador e na base no celular, centralizado. É de servidor e sem estado: a página diz qual aba está ativa, e a luz (barra com brilho e cone, em paper, nunca no amarelo) acende nela. Fica fora da tela do título, da sala de grupo e da busca; painéis e avisos ficam acima dela."
            >
                <Row label="Início ativo, sobre uma imagem clara (aqui solta para caber na página)">
                    <div className="relative h-28 w-full transform-gpu overflow-hidden bg-paper">
                        <Navbar current="inicio" />
                    </div>
                </Row>
                <Row label="Sobre ativo">
                    <div className="relative h-28 w-full transform-gpu overflow-hidden bg-frame">
                        <Navbar current="sobre" />
                    </div>
                </Row>
                <p className="text-caption text-soft">
                    Espaço que ela toma: <TokenValue name="--spacing-nav" />; vidro{" "}
                    <TokenValue name="--color-nav" />.
                </p>
            </Spec>

            <Spec
                name="Availability"
                props={["streamings: StreamingService[]", "className?"]}
                does="Onde assistir: a informação principal do título, logo abaixo dele e antes da chamada. É texto, não controle: nada de pílula nem amarelo."
            >
                <Row label="três">
                    <Availability streamings={availableStreamings([8, 1899, 119])} />
                </Row>
                <Row label="cinco">
                    <Availability streamings={STREAMING_SERVICES} />
                </Row>
                <p className="text-caption text-soft">Sem streaming, nada aparece.</p>
            </Spec>

            <Spec
                name="Facts · Fact"
                props={["Facts: <ul>", "Fact: <li>"]}
                does="Os dados do título numa linha, separados por um fio: gênero (em negrito), ano e duração."
            >
                <Row label="normal">
                    <Facts>
                        <Fact>Suspense</Fact>
                        <Fact>2017</Fact>
                        <Fact>1h 44min</Fact>
                    </Facts>
                </Row>
                <DoDont
                    use={{
                        note: "só os dados que existem.",
                        example: (
                            <Facts>
                                <Fact>Drama</Fact>
                                <Fact>2019</Fact>
                            </Facts>
                        ),
                    }}
                    avoid={{
                        note: "fio sobrando ou dado vazio.",
                        example: (
                            <Facts>
                                <Fact>Drama</Fact>
                                <Fact>2019</Fact>
                                <Fact>—</Fact>
                            </Facts>
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
                name="RemovableChip"
                props={["children", "removeLabel: string", "onRemove", "removeRef?"]}
                does="Mostra uma escolha que se tira com um toque, como a pessoa escolhida nos filtros. O botão de remover tem o alvo de toque inteiro e é concêntrico à pílula."
            >
                <States
                    states={["normal", "foco"]}
                    render={(state) => (
                        <RemovableChipDemo className={state === "foco" ? focusRing : undefined} />
                    )}
                />
            </Spec>

            <Spec
                name="GlassPanel · Slider"
                props={[
                    "GlassPanel: <div>",
                    "Slider: label, value, min, max, valueText",
                    "Digits: text",
                ]}
                does="O painel de vidro reúne os filtros sobre a imagem; o slider escolhe um número com o valor escrito ao lado; Digits põe cada algarismo numa célula fixa, no slider e no contador. No celular o painel ocupa a tela."
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
