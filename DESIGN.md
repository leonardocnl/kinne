# Design do Kinne

Leitura obrigatória antes de qualquer tarefa de interface. A fonte da verdade visual é a maquete aprovada, `docs/design/maquete-kinnemix.html`. Os tokens estão em `src/app/globals.css`, os componentes em `src/app/_components/ui/` e a referência viva em `/design`.

Última atualização: 28 de outubro de 2026.

## Tokens

- Só tokens. Fora do `globals.css` é proibido usar hex, px ou valores arbitrários do Tailwind (`bg-[#123]`, `text-[17px]`, `w-(--x)`, `[&_svg]:…`). O teste `src/app/design-tokens.test.ts` falha se aparecer algum.
- A escala numérica do Tailwind (`gap-3.5`, `px-5.5`, `opacity-80`, `scale-98`) vale, porque deriva dos tokens.
- Valor novo entra primeiro como token no `@theme`, com nome e comentário dizendo onde se usa.
- Celular vai até 860px. Use `max-desktop:` para o celular e `desktop:` para o computador.
- Um `--container-*` nunca tem o nome de um `--spacing-*`: no Tailwind v4, `w-<nome>` e `max-w-<nome>` acham o espaçamento antes do container, e a largura sai errada sem aviso (o painel de filtros já ficou com 1.25rem assim). O teste de tokens confere.

## Cor

- O amarelo (`signal`) aparece só no controle mais importante de cada tela e no ícone da marca. Um amarelo por tela.
- Exceção do dono (28/10/2026): no painel do elenco (`CastDialog`), o nome do personagem é `signal`. O painel é uma camada modal que escurece a tela, e o controle principal dela ("Vou assistir") fica apagado atrás, então o amarelo do personagem não disputa com ele. Nenhum outro elemento do painel é amarelo. Contraste do `signal` sobre o vidro, no pior caso (página branca atrás): 9,3:1 no computador e 13:1 no celular.
- Exceção do dono (28/10/2026): a cortina entre títulos (`ColorWipe`, ver Navegação) tem fios amarelos em degradê, do `signal` ao `signal-deep` (o âmbar que o horizonte do rodapé já usa; nenhum token novo). Só existe durante a animação, quando a tela está coberta e não há controle à vista para disputar com ele.
- Exceção do dono (28/10/2026): na entrada da sala, a luz que passa pelos passos (fio e ícone) é `signal`; decorativa e um passo por vez, convive com "Criar uma sala".
- Exceção do dono (28/10/2026): na tela de fim de rodada dos filtros, o texto grande em caracteres do quadro ("rodada 2", "fim") é `signal`, com o desdobramento em `signal-deep`. É decorativo (aria-hidden) e convive com o primary da tela ("Sortear entre os próximos 10").
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

- Tela do título no computador (`title-layout`, grid de três colunas): pôster à esquerda (`--spacing-title-poster`, 2:3), alinhado à margem da página e ao topo do título, com 3rem até o texto; sem pôster, a coluna some. Texto no meio e, à direita, o grupo de ações ("Vou assistir", "Já vi", dado) centrado na primeira linha do título (`--spacing-title-line`), que não se move com a sinopse. O texto vai até o vão do grupo. No celular, sem pôster (nem baixado: `hidden` + `loading=lazy`) e com as ações presas à base (`Dock`).
- Onde assistir é a informação principal: é o primeiro dado da ficha (`TitleSpec`), logo abaixo do título, na tela do título e no destaque da home. É texto: sem pílula, sem amarelo, sem logos. Sem streaming, ele some.
- Destaque da home (decisão do dono, 28/10/2026): a mesma disposição da tela do título, sem sinopse nem elenco, que ficam para ela. No computador, pôster à esquerda (`title-layout`, só no computador; o celular nem baixa), título, a ficha (onde assistir, gênero, ano, duração; `PickSpecs`, feita no servidor), a chamada em `paper` e "Ver este título →"; à direita, na altura da primeira linha do título, "Escolher agora", "Me surpreenda" e "Assistir em grupo", lado a lado e da mesma largura, a do maior deles (grid de colunas iguais). No celular, sem pôster, e as ações embaixo: o par lado a lado e o grupo abaixo, na largura toda. Na troca de capa, pôster, ficha e chamada somem e voltam com o título.
- Ficha da tela do título, logo abaixo dele: onde assistir, gênero, ano, duração, direção e elenco, cada um com rótulo em `text-caption` `font-semibold` `tracking-code` `uppercase` `soft` (como os rótulos do rodapé) e o valor em `text-body` `paper` embaixo; sem fios, quebra limpa. O elenco é o botão "Ver N nomes" (altura do texto; o alvo de toque vem de um `before`), que abre o `CastDialog`: um `<dialog>` modal (`aria-modal`, título em `aria-labelledby`), na camada do topo do navegador, acima da navbar e de tudo, sobre a página escurecida (`backdrop:bg-scrim-strong`). No computador é uma caixa do vidro dos filtros (`GlassPanel`) centralizada na horizontal e na vertical, com largura `--container-cast` (no máximo a tela menos as margens) e altura do conteúdo até `--spacing-cast-height` (80% da janela); no celular ocupa a tela toda, sem cantos. Entra com `panel-up` (sem animação com movimento reduzido), e a página atrás não rola enquanto está aberto. Cabeçalho com o pôster (quando há), "Elenco · N nomes" em `text-caption` `soft`, o nome do título em `font-display` e o fechar redondo, que recebe o foco ao abrir. Cada pessoa é uma linha, separada por fio e com rolagem interna: número em `text-caption` `soft`, o ator em `font-display` `text-confirm` `paper` à esquerda e o personagem em `text-small` `signal` na coluna da direita (exceção de cor, ver Cor); no celular o personagem desce para baixo do nome, alinhado a ele. Sem personagem, a linha só tem o ator, sem coluna vazia nem travessão. Nomes longos quebram dentro da coluna, sem rolagem horizontal. Fecha no botão redondo, na Esc e no toque fora; o foco volta ao botão "Ver N nomes".
- Painéis de vidro (filtros, elenco): nada de faixa, degradê ou sombra no pé; a lista rola e termina limpa dentro do vidro.
- "Assistir em grupo", na home, é um `ButtonLink` `ghost` (o controle mais apagado, sem amarelo, US011 C1) com o ícone de grupo (`GroupIcon`): no computador ao lado do par "Escolher agora" / "Me surpreenda", no celular abaixo dele.
- Texto corrido com `text-wrap: pretty` (sinopse); chamadas e frases curtas com `text-wrap: balance`.
- Painel de busca no computador: o pé nunca passa do pé da imagem grande (`--spacing-search-panel`); a lista rola por dentro.

## Navegação

- Navbar flutuante em todas as telas (padrão do Kinne): chip com a marca (link para o início), "Início" e "Sobre", só texto, em partes iguais; ao lado, fora do chip, a lupa da busca. No computador, fixa no topo e centralizada; no celular, na base, acima da área segura (`nav-bottom`) e, na tela do título, acima do Dock (`--nav-lift`). A data não aparece na barra do topo (decisão do dono, 28/10/2026). O "Voltar" é redondo, só com a seta (`aria-label`), à esquerda. Na tela do título e na home, no computador, a imagem grande encosta no topo da tela (`Shell flush`) e a barra do topo flutua sobre ela (`TopBar floating`), fixa, na altura da navbar; o "Voltar" usa então o vidro da navbar (`Button variant="float"`), para ter 4,5:1 sobre qualquer imagem. Assim o pôster cabe inteiro na primeira tela.
- Vidro preto translúcido (`glass`, `smoke` em `ui/navItem.ts`): `bg-nav` a 35%, reflexo `sheen`, desfoque leve (`blur-veil`) e o que passa por trás escurecido (`backdrop-brightness-45`). Exceção da navbar à regra de 7:1: 4,5:1 (AA) até sobre imagem branca, decisão do dono; o teste da navbar confere.
- Aba ativa: traço amarelo (`signal`) de 1px na borda de baixo, com halo (`drop-shadow-limelight`), e um brilho amarelo que sobe atrás do rótulo (`bg-limelight`, com granulado fino), fraco onde há texto. Exceção à regra de um amarelo por tela. A posição vem de `--nav-index` (prop `current`) e desliza entre páginas com o `ViewTransition` do React; sem suporte aparece no lugar, e com `prefers-reduced-motion` nada desliza. Fora do Início e do Sobre, nenhuma aba fica ativa.
- Cortina entre títulos (`RouteWipe` no layout raiz, `ColorWipe`): só na tela do título, quando "Já vi", o dado ou a rodada dos filtros levam a outro título (`wipeRouter` em `ui/wipe.ts`), só no computador (`desktop:`) e sem movimento reduzido. Abas, links e o celular trocam na hora, e a luz da navbar desliza como sempre. 10 colunas no vidro do site (o da navbar com o desfoque do painel: `bg-nav`, `sheen`, `backdrop-blur-glass`, `backdrop-brightness-45`), lado a lado sem sobreposição nem borda (senão aparecem emendas escuras), descem do topo; só o `transform` anima (`translate3d`, uma camada por coluna com `will-change-transform`), uma a cada 0,03 s, em 0,55 s cada, em ease-in-out cúbica (0,82 s para cobrir), com um fio de 10px (`h-2.5`) na frente e atrás. As faixas começam já no clique (`beginWipe`) e cobrem também o tempo do sorteio no servidor; se ele não levar a outro título, saem sem trocar a tela (`cancelWipe`). Coberta a tela e conhecido o destino, o roteador troca o endereço; as faixas só saem (outros 0,82 s) quando a URL muda e a imagem grande da tela nova carregou e foi decodificada, no máximo 2 s depois. A cortina é decorativa (`aria-hidden`, sem nada focável) e bloqueia os cliques só enquanto existe. O motion e a cortina baixam depois de a página abrir, fora do JS inicial.
- Abas inativas em `soft`; no hover só sobem para `paper`, sem fundo nem contorno.
- Busca (computador): um vidro só, recortado por um caminho com duas partes (`clip-search`, `clip-search-open`), mais um contorno no mesmo caminho (`rim-search`): fechada é a lupa; aberta, o campo se estica e a gota do fechar sai na frente, com um fio que afina e some (gosma). O espaço do campo fica reservado e o grupo só desliza (`translate-x-nav-shift`): nada anima largura. Os resultados aparecem depois da primeira letra, no mesmo vidro, da largura de navbar + busca, com pôster maior. A linha sob o mouse ou escolhida pelas setas só ganha o fundo `hover`, sem borda; só as setas rolam a lista até ela, e ao sair da lista com o mouse nenhuma linha fica acesa. No celular, a busca abre em tela cheia.
- A navbar é componente de servidor; a lupa é o único JS dela e recebe as classes como prop, para irem no HTML e não no JS da home.
- Camadas: navbar `z-nav` (1) abaixo do painel de filtros (2), do Dock (10) e do aviso (20); com a busca aberta ela sobe acima de todos. A cortina (`z-100`) fica acima de tudo, inclusive da busca aberta.
- Respiro: `[data-nav]` dá à página `--spacing-nav` embaixo no celular (mais o Dock, quando há) e `scroll-padding-top` no computador.

- Entrada da sala (`/sala`, `Entry`, US011 C1): o quadro explica a tela. Na caixa do quadro, em `ink` (sem o granulado do `Frame`), encostada no topo (`Shell flush`, barra do topo flutuando; espera, votação e resultado, sem quadro, ganham `pt-nav`), os três passos grandes, lado a lado: ícone de linha (QR code, celular, check), número em `text-caption` `soft`, passo em `font-display` `text-heading` e explicação em `text-body` `soft`, com fio em cima. Uma luz amarela (o fio e o ícone em `signal`, com o halo da aba ativa) passa de um passo para o outro, 1 → 2 → 3, em 6 s (`animate-step-light`, só opacity; exceção de cor, ver Cor); com movimento reduzido, nada acende. No celular, sem proporção fixa, um passo embaixo do outro. Embaixo, como a tela do título: o título, a frase em `paper` e, à direita, na altura da primeira linha do título, "Criar uma sala" e "Entrar com um código", da mesma largura. O código entra no mesmo lugar, num campo de `--spacing-room-code`.
- Saguão da sala (`Lobby`, US011 C2, C5, C6): sem caixas nem fios, em duas colunas. À esquerda (8 de 12): "Sala de grupo", o código (rótulo da ficha e o código em `font-display` `text-title`), como entrar, as escolhas (rótulo da ficha em caixa alta e os chips, separadas só por espaço) e, logo depois, "Pronto", "Ver as opções" e "Sair da sala". À direita (4 de 12, até 22rem), no alto: o QR code, quadrado, e embaixo quem entrou, uma pessoa por linha, com "pronto" e o check. Ocupa a altura da tela, para o rodapé ficar abaixo.
- Telas sem título (404 da página, 404 do título e fim de rodada dos filtros, `StateScreen`): o quadro vazio leva um texto grande em caracteres (`AsciiType`): "404" no 404 do título e, no fim da rodada, a rodada que vem ("rodada 2") ou "fim". O 404 da raiz fica sem ele: o que o `not-found.tsx` da raiz importa entra no JS de toda página (cerca de 2,2 KB a mais na home). O `AsciiType` baixa sob demanda (`AsciiArt`). Fica sempre visível e apagado; perto do ponteiro (mouse ou dedo) os caracteres acendem, embaralham e ganham brilho, em `paper` e `faint` (sem amarelo); no fim da rodada, em `signal` e `signal-deep`, e a luz passeia sozinha pelo texto enquanto não há ponteiro (exceção de cor, ver Cor). Com movimento reduzido, fica parado.

## Imagens

- Sempre do `image.tmdb.org`, em `<img>` simples (`TmdbImage`), nunca `next/image` nem a otimização da hospedagem (RNF08). Os endereços saem de `ui/tmdb-sources.ts`.
- Imagem grande (quadro): `w780`, `w1280` e `original` com a largura real guardada pela carga, com `sizes` do quadro (página menos as margens no computador, tela toda no celular). A primeira imagem da tela carrega já, com `fetchpriority="high"`. Na tela inicial, das cinco capas só a atual e a próxima baixam ao abrir; as outras, quando chega a vez delas.
- Miniaturas da faixa "Hoje": `w300` e `w780`. Pôsteres pequenos: `w92`, com `w185` nas telas 2x.
- O layout raiz abre a conexão com o `image.tmdb.org` (`preconnect`).
- O ícone da marca (`public/icon.svg`, dentro da navbar) é um `<img>` do SVG em `public/`, sem `next/image`: o JS do `next/image` passaria a ir em toda página.

## Orçamento

- JS da tela inicial: no máximo 152 KB gzip (era 150; o dono subiu para 151 em 25/10/2026, para o gatilho do horizonte animado do rodapé, que baixa o WebGL só quando o rodapé chega perto, e para 152 em 28/10/2026, para o gatilho da cortina entre títulos, que baixa o motion sob demanda) no que um navegador moderno baixa (`npm run bundle:check`, no CI). Painéis que abrem por ação (filtros, busca) carregam sob demanda.
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
- Texto corrido com até 80 caracteres por linha (`max-w-measure`). Exceção do dono (27/10/2026): a sinopse da tela do título vai até 100 (`max-w-synopsis`).
