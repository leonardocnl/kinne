import { Button } from "../../_components/ui/Button";
import { Frame } from "../../_components/ui/Frame";
import { Score } from "../../_components/ui/Score";
import { QrCode } from "../../_components/ui/QrCode";
import { Skeleton } from "../../_components/ui/Skeleton";
import { Toast } from "../../_components/ui/Toast";
import { AsciiHorizon } from "../../_components/ui/AsciiHorizon";
import { AsciiType } from "../../_components/ui/AsciiType";
import { PEOPLE } from "../../_components/ui/figures";
import { BackIcon, PlayIcon } from "../../_components/ui/icons";
import { TokenValue } from "./live";
import { DoDont, Row, Spec } from "./Spec";

export function Media() {
    return (
        <>
            <Spec
                name="Frame · FrameImage · TmdbImage · Score"
                props={[
                    "Frame: bottomShade?, children",
                    "FrameImage: path, width, visible?, priority?",
                    "TmdbImage: sources, sizes?, priority?",
                    "Score: value",
                ]}
                does="O quadro mostra a imagem do título com gradiente e grão; a nota do TMDB fica por cima, como texto. As imagens vêm direto do TMDB, com os tamanhos dele no srcset, sem a otimização da hospedagem (RNF08)."
            >
                <p className="text-caption text-soft">
                    Proporção <TokenValue name="--aspect-scope" /> no computador e{" "}
                    <TokenValue name="--aspect-video" /> no celular, de ponta a ponta; corte a
                    partir de <TokenValue name="--object-position-focus" /> para não perder cabeças.
                </p>
                <Frame bottomShade>
                    <Button
                        variant="round"
                        aria-label="Voltar ao início"
                        className="absolute top-2.5 left-3"
                    >
                        <BackIcon />
                    </Button>
                    <Button
                        variant="quiet"
                        icon={<PlayIcon />}
                        className="absolute bottom-4 left-4"
                    >
                        Trailer
                    </Button>
                    <Score value="8,0" />
                </Frame>
                <DoDont
                    use={{
                        note: "imagem com canto reto.",
                        example: <span className="block aspect-video w-full bg-skeleton" />,
                    }}
                    avoid={{
                        note: "imagem com canto arredondado.",
                        example: (
                            <span className="block aspect-video w-full rounded-card bg-skeleton" />
                        ),
                    }}
                />
                <DoDont
                    use={{
                        note: "a nota é texto: não se toca.",
                        example: (
                            <div className="relative h-20 w-full">
                                <Score value="8,0" />
                            </div>
                        ),
                    }}
                    avoid={{
                        note: "a nota em pílula, parecendo botão.",
                        example: (
                            <span className="inline-flex h-target items-center gap-1.75 rounded-pill border border-line bg-chip px-3.75 text-small">
                                8,0 TMDB
                            </span>
                        ),
                    }}
                />
            </Spec>

            <Spec
                name="Toast"
                props={["message?", "children?", "className?"]}
                does="Confirma em poucas palavras o que acabou de acontecer, com ações curtas ao lado se preciso (a pergunta “Curtiu?”). Fica sempre na página, vazio e invisível, para o leitor de tela anunciar o texto novo."
            >
                <Row label="com texto">
                    <Toast message="Anotado: você já viu Chernobyl." />
                </Row>
                <Row label="com pergunta">
                    <Toast message="Anotado: você já viu Chernobyl.">
                        <span className="font-medium">Curtiu?</span>
                        <Button variant="round" aria-label="Curti">
                            <span aria-hidden="true">👍</span>
                        </Button>
                        <Button variant="round" aria-label="Não curti">
                            <span aria-hidden="true">👎</span>
                        </Button>
                    </Toast>
                </Row>
                <DoDont
                    use={{
                        note: "uma frase curta.",
                        example: <Toast message="Anotado: você já viu Chernobyl." />,
                    }}
                    avoid={{
                        note: "um parágrafo que pede leitura.",
                        example: (
                            <Toast message="Anotamos que você já viu Chernobyl. A partir de agora ela não aparece mais nas recomendações, e você pode desfazer isso nas configurações." />
                        ),
                    }}
                />
            </Spec>

            <Spec
                name="QrCode"
                props={["text", "label", "className?"]}
                does="QR code de um texto, em SVG, sem biblioteca. Módulos escuros em ink sobre o papel claro, com a margem de silêncio que a leitura pede. O tamanho vem de quem usa; o label diz para que serve."
            >
                <Row label="endereço da sala">
                    <QrCode
                        text="https://kinne.app/sala/ABCD2345"
                        label="QR code de exemplo"
                        className="size-40"
                    />
                </Row>
            </Spec>

            <Spec
                name="Skeleton"
                props={[
                    'shape: "frame" | "title" | "line" | "data" | "button" | "count"',
                    "className?",
                ]}
                does="Ocupa o lugar do conteúdo enquanto ele carrega. Pulsa devagar; parado com movimento reduzido."
            >
                <Skeleton shape="frame" />
                <div className="flex flex-col gap-3">
                    <Skeleton shape="title" className="w-4/5 max-w-130" />
                    <Skeleton shape="line" className="w-11/12 max-w-140" />
                    <Skeleton shape="count" className="font-display" />
                    <span className="flex gap-2.5">
                        <Skeleton shape="data" />
                        <Skeleton shape="data" />
                        <Skeleton shape="data" />
                    </span>
                    <span className="flex w-full gap-2.5 desktop:w-90">
                        <Skeleton shape="button" className="grow-8 basis-0" />
                        <Skeleton shape="button" className="grow-5 basis-0" />
                    </span>
                </div>
                <DoDont
                    use={{
                        note: "cada forma imita o que vai substituir.",
                        example: (
                            <span className="flex w-full flex-col gap-3">
                                <Skeleton shape="title" className="w-4/5" />
                                <Skeleton shape="button" className="w-1/2" />
                            </span>
                        ),
                    }}
                    avoid={{
                        note: "a mesma barra no lugar de tudo.",
                        example: (
                            <span className="flex w-full flex-col gap-3">
                                <Skeleton shape="line" className="w-4/5" />
                                <Skeleton shape="line" className="w-1/2" />
                            </span>
                        ),
                    }}
                />
            </Spec>
            <Spec
                name="AsciiHorizon"
                props={["className?"]}
                does="Fundo do rodapé: o horizonte de caracteres nasce na linha do rodapé e clareia até a base, onde fica “kinne” gigante em preto. Em CSS, do servidor, até o animado (WebGL, com mouse e clique) baixar quando o rodapé chega perto; com movimento reduzido fica o de CSS, parado. Decorativo (aria-hidden)."
            >
                <Row label="fundo do rodapé de toda tela">
                    <div className="relative aspect-kinne w-full">
                        <AsciiHorizon className="absolute inset-0" />
                    </div>
                </Row>
            </Spec>
            <Spec
                name="AsciiType"
                props={["text?", "figure?", "tone?", "drift?", "className?"]}
                does="Texto grande desenhado em caracteres, no quadro das telas 404 (página e título). Sempre visível, apagado; perto do ponteiro (mouse ou dedo) os caracteres acendem, embaralham e ganham brilho e um leve desdobramento, e a área segue o ponteiro com atraso. Canvas 2D, sem dependência; parado quando o ponteiro está longe; com movimento reduzido, o desenho fica parado. Decorativo (aria-hidden)."
            >
                <Row label="fim de rodada: signal, passeando sozinho">
                    <div className="relative aspect-video w-full bg-skeleton">
                        <AsciiType
                            text="rodada 2"
                            tone="signal"
                            drift
                            className="absolute inset-0 size-full"
                        />
                    </div>
                </Row>
                <Row label="figura: entrada da sala">
                    <div className="relative aspect-video w-full bg-skeleton">
                        <AsciiType
                            figure={PEOPLE}
                            tone="signal"
                            drift
                            className="absolute inset-0 size-full"
                        />
                    </div>
                </Row>
                <Row label="passe o mouse">
                    <div className="relative aspect-video w-full bg-skeleton">
                        <AsciiType text="404" className="absolute inset-0 size-full" />
                    </div>
                </Row>
            </Spec>
            <Spec
                name="RouteWipe · ColorWipe"
                props={[
                    "RouteWipe: children, columns?, duration?, staggerDelay?, ease?, direction?, exitOpposite?",
                    "ColorWipe: covering, onCovered, onUncovered (e as mesmas opções)",
                ]}
                does="Cortina na troca de um título para outro na tela do título (“Já vi”, o dado e as rodadas dos filtros), só no computador e sem movimento reduzido: 10 colunas de vidro descendo do topo, com um fio do signal ao signal-deep na frente e atrás de cada uma, cobrem a tela em 0,82 s, o roteador troca o endereço e elas descobrem em 0,82 s quando a URL muda e a imagem grande carregou (no máximo 2 s). Abas, links e o celular trocam na hora. Pedida com requestWipe (ui/wipe.ts). Decorativa (aria-hidden)."
            >
                <Row label="no computador, na tela do título">
                    <span className="text-small text-soft">Clique em “Já vi” ou no dado.</span>
                </Row>
            </Spec>
        </>
    );
}
