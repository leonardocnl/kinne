import { Button } from "../../_components/ui/Button";
import { Frame } from "../../_components/ui/Frame";
import { Score } from "../../_components/ui/Score";
import { Skeleton } from "../../_components/ui/Skeleton";
import { Toast } from "../../_components/ui/Toast";
import { Wordmark } from "../../_components/ui/Wordmark";
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
                    "FrameImage: path, visible?, priority?",
                    "TmdbImage: path, widths, priority?",
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
                props={["message?", "className?"]}
                does="Confirma em poucas palavras o que acabou de acontecer. Fica sempre na página, vazio e invisível, para o leitor de tela anunciar o texto novo."
            >
                <Row label="com texto">
                    <Toast message="Anotado: você já viu Chernobyl." />
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
                name="Wordmark"
                props={["className?"]}
                does="A marca do Kinne, amarela como o controle principal, no canto da barra do topo."
            >
                <Row label="normal">
                    <Wordmark />
                </Row>
                <DoDont
                    use={{ note: "uma vez, no topo.", example: <Wordmark /> }}
                    avoid={{
                        note: "repetida na mesma tela.",
                        example: (
                            <>
                                <Wordmark />
                                <Wordmark />
                            </>
                        ),
                    }}
                />
            </Spec>
        </>
    );
}
