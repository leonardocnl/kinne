import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Button } from "../_components/ui/Button";
import { Frame } from "../_components/ui/Frame";
import { Score } from "../_components/ui/Score";
import { Skeleton } from "../_components/ui/Skeleton";
import { TextLink } from "../_components/ui/TextLink";
import { Toast } from "../_components/ui/Toast";
import { Wordmark } from "../_components/ui/Wordmark";
import { FiltersDemo, TokenValue } from "./live";

export const metadata: Metadata = {
    title: "Design system · Kinne",
    robots: { index: false, follow: false },
};

// As classes ficam escritas por inteiro para o Tailwind encontrá-las.
const colors = [
    { name: "ink", className: "bg-ink", role: "Fundo" },
    { name: "paper", className: "bg-paper", role: "Texto" },
    { name: "signal", className: "bg-signal", role: "Só o controle principal e a wordmark" },
    { name: "soft", className: "bg-soft", role: "Texto secundário" },
    { name: "faint", className: "bg-faint", role: "Texto apagado" },
    { name: "line", className: "bg-line", role: "Bordas e divisórias" },
    { name: "line-strong", className: "bg-line-strong", role: "Borda no hover" },
    { name: "chip", className: "bg-chip", role: "Fundo do chip" },
    { name: "ghost", className: "bg-ghost", role: "Botão ghost, brilho do skeleton" },
    { name: "quiet", className: "bg-quiet", role: "Vidro dos botões quiet e round" },
    { name: "glass", className: "bg-glass", role: "Painel de vidro" },
    { name: "hover", className: "bg-hover", role: "Fundo no hover" },
    { name: "halo", className: "bg-halo", role: "Anel do slider" },
    { name: "rail", className: "bg-rail", role: "Barra de progresso" },
    { name: "track", className: "bg-track", role: "Trilho do slider" },
    { name: "scrim", className: "bg-scrim", role: "Tinta do painel (computador)" },
    { name: "scrim-strong", className: "bg-scrim-strong", role: "Tinta do painel (celular)" },
    { name: "frame", className: "bg-frame", role: "Quadro sem imagem" },
    { name: "toast", className: "bg-toast", role: "Aviso" },
];

const display = "font-display font-medium";
const type = [
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
    { name: "body", className: "text-body", sample: "Texto base e botões" },
    { name: "small", className: "text-small", sample: "Chips, links e botão ghost" },
    { name: "data", className: "text-data text-soft", sample: "Comédia · 2014 · 1h 40min" },
    {
        name: "caption",
        className: "text-caption text-faint",
        sample: "Dados de filmes e séries: TMDB",
    },
];

const sizes = [
    { name: "control", className: "h-control", role: "Altura dos botões" },
    { name: "target", className: "h-target", role: "Alvo mínimo de toque; chips e links" },
    { name: "gutter", className: "h-gutter", role: "Margem lateral da página" },
    { name: "skeleton-title", className: "h-skeleton-title", role: "Bloco de título do skeleton" },
];

const radii = [
    { name: "pill", className: "rounded-pill", role: "Todo controle tocável" },
    { name: "panel", className: "rounded-panel", role: "Painel de vidro" },
    { name: "card", className: "rounded-card", role: "Aviso; título do skeleton" },
];

const motion = [
    { name: "hover", className: "duration-hover", role: "Hover e giro do ícone" },
    { name: "fade", className: "duration-fade", role: "Textos e aviso aparecendo" },
    { name: "panel", className: "duration-panel", role: "Painel de filtros entrando" },
    { name: "dissolve", className: "duration-dissolve", role: "Troca de imagem" },
];

export default function DesignPage() {
    return (
        <main className="mx-auto flex w-full max-w-page flex-col gap-14 px-gutter py-10">
            <header className="flex flex-col gap-4">
                <Wordmark className="self-start" />
                <h1 className={`${display} text-title`}>Design system</h1>
                <p className="max-w-measure text-tagline text-soft">
                    Tokens e componentes traduzidos da maquete KinneMix. Regras em DESIGN.md.
                    Redimensione a janela para ver a versão do celular, que vai até 860 pixels de
                    largura.{" "}
                    <span className="text-paper">
                        Você está vendo a versão do <span className="desktop:hidden">celular</span>
                        <span className="max-desktop:hidden">computador</span>.
                    </span>
                </p>
            </header>

            <Section title="Cores">
                <ul className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
                    {colors.map((color) => (
                        <li key={color.name} className="flex flex-col gap-2">
                            <span
                                className={`block h-16 rounded-card border border-line ${color.className}`}
                            />
                            <Token name={color.name} variable={`--color-${color.name}`} />
                            <span className="text-caption text-soft">{color.role}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Texto">
                <ul className="flex flex-col gap-6">
                    {type.map((item) => (
                        <li
                            key={item.name}
                            className="flex flex-col gap-2 border-t border-line pt-3"
                        >
                            <p className={item.className}>{item.sample}</p>
                            <Token name={item.name} variable={`--text-${item.name}`} />
                            <span className="text-caption text-faint">
                                linha <TokenValue name={`--text-${item.name}--line-height`} />
                            </span>
                        </li>
                    ))}
                    <li className="flex flex-col gap-2 border-t border-line pt-3">
                        <p className="text-caption tracking-code text-faint uppercase">
                            Erro de conexão
                        </p>
                        <Token name="tracking-code" variable="--tracking-code" />
                    </li>
                </ul>
            </Section>

            <Section title="Espaçamento e tamanhos">
                <p className="max-w-measure text-data text-soft">
                    Distâncias usam a escala do Tailwind, em passos de{" "}
                    <TokenValue name="--spacing" /> (p-1, gap-3.5, px-5.5…). Os tamanhos com nome:
                </p>
                <ul className="flex flex-wrap items-end gap-8">
                    {sizes.map((size) => (
                        <li key={size.name} className="flex flex-col gap-2">
                            <span className={`block w-12 bg-paper ${size.className}`} />
                            <Token name={size.name} variable={`--spacing-${size.name}`} />
                            <span className="text-caption text-soft">{size.role}</span>
                        </li>
                    ))}
                    <li className="flex w-full flex-col gap-2">
                        <span className="block h-4 w-measure max-w-full bg-paper" />
                        <Token name="measure" variable="--container-measure" />
                        <span className="text-caption text-soft">
                            Texto corrido (até 80 caracteres)
                        </span>
                    </li>
                </ul>
            </Section>

            <Section title="Raios, vidro e sombras">
                <ul className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
                    {radii.map((radius) => (
                        <li key={radius.name} className="flex flex-col gap-2">
                            <span
                                className={`block h-16 border border-line bg-quiet ${radius.className}`}
                            />
                            <Token name={radius.name} variable={`--radius-${radius.name}`} />
                            <span className="text-caption text-soft">{radius.role}</span>
                        </li>
                    ))}
                    <li className="flex flex-col gap-2">
                        <span className="block h-16 rounded-card border border-line bg-glass shadow-glass backdrop-blur-glass" />
                        <Token name="glass" variable="--blur-glass" />
                        <span className="text-caption text-soft">
                            Desfoque do vidro; sombra <TokenValue name="--shadow-glass" />
                        </span>
                    </li>
                </ul>
            </Section>

            <Section title="Movimento">
                <p className="text-data text-soft">
                    Passe o mouse sobre as barras. Com movimento reduzido, nada se move.
                </p>
                <ul className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
                    {motion.map((item) => (
                        <li key={item.name} className="group flex flex-col gap-2">
                            <span className="block h-1 overflow-hidden bg-rail">
                                <span
                                    className={`block h-full origin-left scale-x-25 bg-paper transition-transform ease-settle group-hover:scale-x-100 motion-reduce:transition-none ${item.className}`}
                                />
                            </span>
                            <Token
                                name={item.name}
                                variable={`--transition-duration-${item.name}`}
                            />
                            <span className="text-caption text-soft">{item.role}</span>
                        </li>
                    ))}
                </ul>
            </Section>

            <Section title="Quadro (Frame)">
                <p className="max-w-measure text-data text-soft">
                    Cantos retos. Proporção <TokenValue name="--aspect-scope" /> no computador e{" "}
                    <TokenValue name="--aspect-video" /> no celular, de ponta a ponta. A imagem é
                    cortada a partir de <TokenValue name="--object-position-focus" /> para não
                    perder cabeças. Por cima: gradiente e grão.
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
            </Section>

            <Section title="Botões (Button)">
                <Demo
                    label="primary"
                    note="Amarelo: um só por tela. No hover não muda de cor; ao pressionar, encolhe um pouco."
                >
                    <Button variant="primary">Escolher agora</Button>
                    <Button variant="primary" disabled>
                        Ver recomendação
                    </Button>
                </Demo>
                <Demo
                    label="quiet"
                    note="Vidro escuro. No hover o fundo e a borda clareiam. Com ícone, como “Já vi”."
                >
                    <Button variant="quiet">Me surpreenda</Button>
                    <Button variant="quiet" icon={<CheckIcon />}>
                        Já vi
                    </Button>
                    <Button variant="quiet" disabled>
                        Me surpreenda
                    </Button>
                </Demo>
                <Demo label="ghost" note="Para o topo da tela. Hover igual ao quiet.">
                    <Button variant="ghost">Entrar</Button>
                    <Button variant="ghost" icon={<span aria-hidden="true">←</span>}>
                        Voltar
                    </Button>
                    <Button variant="ghost" disabled>
                        Entrar
                    </Button>
                </Demo>
                <Demo
                    label="round"
                    note="Círculo só com ícone e nome em aria-label. O dado gira no hover (opção spinIcon)."
                >
                    <Button variant="round" aria-label="Fechar filtros">
                        <CloseIcon />
                    </Button>
                    <Button variant="round" aria-label="Outra opção" spinIcon>
                        <DiceIcon />
                    </Button>
                    <Button variant="round" aria-label="Fechar filtros" disabled>
                        <CloseIcon />
                    </Button>
                </Demo>
                <p className="text-data text-soft">
                    Todos: foco visível com contorno claro (navegue com Tab) e desativado com
                    opacidade <TokenValue name="--opacity-disabled" />.
                </p>
            </Section>

            <Section title="Links (TextLink)">
                <Demo label="link e botão" note="O sublinhado fica claro no hover.">
                    <TextLink href="/design">
                        Ver este título <span aria-hidden="true">→</span>
                    </TextLink>
                    <TextLink aria-expanded="false">Ler mais</TextLink>
                </Demo>
            </Section>

            <Section title="Painel de vidro (GlassPanel), Chip e Slider">
                <p className="max-w-measure text-data text-soft">
                    Streamings: seleção múltipla (aria-pressed). Tipo: seleção única (rádio, use as
                    setas). O chip marcado não muda no hover. No celular o painel ocupa a tela, sem
                    cantos.
                </p>
                <div className="relative bg-frame p-4 max-desktop:-mx-gutter max-desktop:p-0">
                    <FiltersDemo />
                </div>
            </Section>

            <Section title="Aviso (Toast)">
                <p className="max-w-measure text-data text-soft">
                    Sempre na página com role=&quot;status&quot;; vazio fica invisível, e o texto
                    novo é anunciado.
                </p>
                <Toast message="Anotado: você já viu Chernobyl." />
            </Section>

            <Section title="Carregando (Skeleton)">
                <p className="max-w-measure text-data text-soft">
                    Pulsa em claridade, devagar; parado com movimento reduzido. Cada forma imita o
                    que vai substituir.
                </p>
                <Skeleton shape="frame" />
                <div className="flex flex-col gap-3">
                    <Skeleton shape="title" className="w-4/5 max-w-130" />
                    <Skeleton shape="title" className="w-1/2 max-w-80" />
                    <Skeleton shape="line" className="w-11/12 max-w-140" />
                    <Skeleton shape="line" className="w-3/5 max-w-75" />
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
            </Section>
        </main>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-5">
            <h2 className={`${display} border-b border-line pb-3 text-heading`}>{title}</h2>
            {children}
        </section>
    );
}

function Demo({ label, note, children }: { label: string; note: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">{children}</div>
            <p className="text-data text-soft">
                <b className="font-semibold text-paper">{label}</b> · {note}
            </p>
        </div>
    );
}

function Token({ name, variable }: { name: string; variable: string }) {
    return (
        <span className="flex flex-col">
            <span className="text-data font-semibold">{name}</span>
            <TokenValue name={variable} />
        </span>
    );
}

// ícones da maquete
function CloseIcon() {
    return (
        <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <path d="M3 3l10 10M13 3L3 13" />
        </svg>
    );
}

function BackIcon() {
    return (
        <svg
            viewBox="0 0 20 20"
            className="size-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <path d="M17 10H3M8 5l-5 5 5 5" />
        </svg>
    );
}

function PlayIcon() {
    return (
        <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true">
            <path d="M3 1.6v8.8L10.4 6z" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
    );
}

function DiceIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
    );
}
