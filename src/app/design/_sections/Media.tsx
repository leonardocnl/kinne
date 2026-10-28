import { Button } from "../../_components/ui/Button";
import { Frame } from "../../_components/ui/Frame";
import { Score } from "../../_components/ui/Score";
import { QrCode } from "../../_components/ui/QrCode";
import { Skeleton } from "../../_components/ui/Skeleton";
import { Toast } from "../../_components/ui/Toast";
import { AsciiHorizon } from "../../_components/ui/AsciiHorizon";
import { ProfileCard } from "../../_components/ui/ProfileCard";
import ProfileCardPopover from "../../_components/ui/ProfileCardPopover";
import { TextLink } from "../../_components/ui/TextLink";
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
                name="ProfileCard · ProfileCardPopover"
                props={[
                    "ProfileCard: profile, children",
                    "ProfileCardPopover: profile, open, anchor",
                ]}
                does="Cartão do LinkedIn e do GitHub sobre o link do rodapé: sobe com blur e escala no hover do mouse e no foco do teclado, inclina em 3D seguindo o mouse e fecha ao sair, ao perder o foco e na Esc. Vidro do GlassPanel, sem amarelo, sem foto e sem nada da rede. No toque não aparece; com movimento reduzido só aparece e some. O cartão e o motion baixam quando o rodapé chega perto."
            >
                <Row label="aberto (estático)">
                    {(["linkedin", "github"] as const).map((profile) => (
                        <div key={profile} className="relative h-48 w-80">
                            <div className="absolute right-0 bottom-0">
                                <ProfileCardPopover
                                    profile={profile}
                                    open
                                    anchor={{ current: null }}
                                />
                            </div>
                        </div>
                    ))}
                </Row>
                <Row label="no link (passe o mouse ou use Tab)">
                    <ProfileCard profile="github">
                        <a
                            href="https://github.com/leonardocnl"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-target items-center font-display text-reel font-medium text-paper"
                        >
                            GitHub
                        </a>
                    </ProfileCard>
                </Row>
            </Spec>
            <Spec
                name="RouteWipe · ColorWipe"
                props={[
                    "RouteWipe: children, columns?, duration?, staggerDelay?, ease?, direction?, exitOpposite?",
                    "ColorWipe: covering, onCovered, onUncovered (e as mesmas opções)",
                ]}
                does="Cortina em toda troca de tela por link interno, só no computador e sem movimento reduzido: 10 faixas em ink, com um fio do signal ao signal-deep na frente e atrás de cada uma, cobrem a tela em 0,72 s, o roteador navega e elas descobrem em 0,72 s quando a URL muda (no máximo 2 s). Fica no layout raiz; voltar e avançar do navegador não animam. Decorativa (aria-hidden)."
            >
                <Row label="no computador, clique">
                    <TextLink href="/sobre">Ir para Sobre</TextLink>
                </Row>
            </Spec>
        </>
    );
}
