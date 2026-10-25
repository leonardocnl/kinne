# Design do Kinne

Leitura obrigatória antes de qualquer tarefa de interface. A fonte da verdade visual é a maquete aprovada, `docs/design/maquete-kinnemix.html`. Os tokens estão em `src/app/globals.css`, os componentes em `src/app/_components/ui/` e a referência viva em `/design`.

Última atualização: 25 de outubro de 2026.

## Tokens

- Só tokens. Fora do `globals.css` é proibido usar hex, px ou valores arbitrários do Tailwind (`bg-[#123]`, `text-[17px]`, `w-(--x)`, `[&_svg]:…`). O teste `src/app/design-tokens.test.ts` falha se aparecer algum.
- A escala numérica do Tailwind (`gap-3.5`, `px-5.5`, `opacity-80`, `scale-98`) vale, porque deriva dos tokens.
- Valor novo entra primeiro como token no `@theme`, com nome e comentário dizendo onde se usa.
- Celular vai até 860px. Use `max-desktop:` para o celular e `desktop:` para o computador.
- Um `--container-*` nunca tem o nome de um `--spacing-*`: no Tailwind v4, `w-<nome>` e `max-w-<nome>` acham o espaçamento antes do container, e a largura sai errada sem aviso (o painel de filtros já ficou com 1.25rem assim). O teste de tokens confere.

## Cor

- O amarelo (`signal`) aparece só no controle mais importante de cada tela e no ícone da marca. Um amarelo por tela.
- No hover, todo controle segue o do quiet: fundo `hover` e borda `line-strong`. Nenhum controle ganha cor nova no hover. O primary não muda de cor; só encolhe ao ser pressionado. O chip marcado não muda.

## Forma

- Todo controle tocável é pílula (`rounded-pill`). Botão só de ícone é círculo (`Button variant="round"`, com `aria-label`).
- O que não se toca nunca é pílula. A nota, por exemplo, é texto.
- Única exceção: o skeleton imita a forma do que vai substituir (imagem reta, botão e linhas de texto em pílula, título com `rounded-card`).
- Imagens de filmes e séries têm cantos retos.
- Raios concêntricos: elemento arredondado dentro de outro usa raio de fora = raio de dentro + respiro entre os dois (`--radius-panel` = `--radius-control` + `--spacing-panel`; `--radius-tag` = botão de 32px/2 + `--spacing-tag`).
- Linhas tocáveis dentro de um painel (resultados da busca, sugestões de pessoas) usam `rounded-control`, o raio do painel menos o respiro dele, e não pílula: concêntricas com o painel.
- Toda tela usa `page-container`: largura toda, margem `--spacing-gutter` e, em tela ultralarga, no máximo `--container-page` (16:9 da altura da janela), centralizada.

## Disposição

- Tela do título no computador: o grupo de ações ("Vou assistir", "Já vi", dado) fica à direita, centrado na primeira linha do título (`--spacing-title-line`), e não se move com o tamanho da sinopse. O texto vai até o vão do grupo. No celular, as ações ficam presas à base (`Dock`).
- Texto corrido com `text-wrap: pretty` (sinopse); chamadas e frases curtas com `text-wrap: balance`.
- Painel de busca no computador: o pé nunca passa do pé da imagem grande (`--spacing-search-panel`); a lista rola por dentro.

## Navegação

- Navbar flutuante em todas as telas (padrão do Kinne): chip com a marca (link para o início), "Início" e "Sobre", só texto, em partes iguais; ao lado, fora do chip, a lupa da busca. No computador, fixa no topo e centralizada; no celular, na base, acima da área segura (`nav-bottom`) e, na tela do título, acima do Dock (`--nav-lift`). A data fica à direita da barra do topo só em tela larga (`wide:`). O "Voltar" é redondo, só com a seta (`aria-label`), à esquerda.
- Vidro preto translúcido (`glass`, `smoke` em `ui/navItem.ts`): `bg-nav` a 35%, reflexo `sheen`, desfoque leve (`blur-veil`) e o que passa por trás escurecido (`backdrop-brightness-45`). Exceção da navbar à regra de 7:1: 4,5:1 (AA) até sobre imagem branca, decisão do dono; o teste da navbar confere.
- Aba ativa: traço amarelo (`signal`) de 1px na borda de baixo, com halo (`drop-shadow-limelight`), e um brilho amarelo que sobe atrás do rótulo (`bg-limelight`, com granulado fino), fraco onde há texto. Exceção à regra de um amarelo por tela. A posição vem de `--nav-index` (prop `current`) e desliza entre páginas com o `ViewTransition` do React; sem suporte aparece no lugar, e com `prefers-reduced-motion` nada desliza. Fora do Início e do Sobre, nenhuma aba fica ativa.
- Abas inativas em `soft`; no hover só sobem para `paper`, sem fundo nem contorno.
- Busca (computador): um vidro só, recortado por um caminho com duas partes (`clip-search`, `clip-search-open`), mais um contorno no mesmo caminho (`rim-search`): fechada é a lupa; aberta, o campo se estica e a gota do fechar sai na frente, com um fio que afina e some (gosma). O espaço do campo fica reservado e o grupo só desliza (`translate-x-nav-shift`): nada anima largura. Os resultados aparecem depois da primeira letra, no mesmo vidro, da largura de navbar + busca, com pôster maior. No celular, a busca abre em tela cheia.
- A navbar é componente de servidor; a lupa é o único JS dela e recebe as classes como prop, para irem no HTML e não no JS da home.
- Camadas: navbar `z-nav` (1) abaixo do painel de filtros (2), do Dock (10) e do aviso (20); com a busca aberta ela sobe acima de todos.
- Respiro: `[data-nav]` dá à página `--spacing-nav` embaixo no celular (mais o Dock, quando há) e `scroll-padding-top` no computador.

## Imagens

- Sempre do `image.tmdb.org`, em `<img>` simples (`TmdbImage`), nunca `next/image` nem a otimização da hospedagem (RNF08). Os endereços saem de `ui/tmdb-sources.ts`.
- Imagem grande (quadro): `w780`, `w1280` e `original` com a largura real guardada pela carga, com `sizes` do quadro (página menos as margens no computador, tela toda no celular). A primeira imagem da tela carrega já, com `fetchpriority="high"`.
- Miniaturas da faixa "Hoje": `w300` e `w780`. Pôsteres pequenos: `w92`, com `w185` nas telas 2x.
- O layout raiz abre a conexão com o `image.tmdb.org` (`preconnect`).
- O ícone da marca (`public/icon.svg`, dentro da navbar) é um `<img>` do SVG em `public/`, sem `next/image`: o JS do `next/image` passaria a ir em toda página.

## Orçamento

- JS da tela inicial: no máximo 150 KB gzip no que um navegador moderno baixa (`npm run bundle:check`, no CI). Painéis que abrem por ação (filtros, busca) carregam sob demanda.
- Lighthouse na prévia do `develop`: nota ≥ 90, LCP ≤ 2,0 s, CLS ≤ 0,05, TBT ≤ 200 ms (`lighthouserc.json`).

## Componentes

- Componente novo só entra se for adicionado em `_components/ui` e na página `/design`.
- Nada de componentes ou props que nenhuma tela use.

## Acessibilidade

WCAG 2.2 AA, mais estes critérios AAA do projeto:

- Contraste de 7:1 no texto.
- Alvo de toque de no mínimo 44px (`h-target`). Controles têm 50px (`h-control`).
- Foco visível só no teclado, com um estilo único (anel claro com fio escuro, definido no `globals.css`). Depois de mouse ou toque não há anel: `InputModality` marca `data-input` no `<html>`.
- Movimento reduzido: com `prefers-reduced-motion`, nada se move nem pulsa (`motion-reduce:`).
- Texto corrido com até 80 caracteres por linha (`max-w-measure`).
