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

- Navbar flutuante em chip (pílula) de vidro escuro, com as abas Início e Sobre. No computador fica fixa no topo, centralizada; no celular, fixa na base, acima da área segura (`nav-bottom`). A data do dia, no computador, fica junto da busca.
- O vidro (`bg-nav`) é mais escuro que o painel de filtros e tem 7:1 no texto até sobre imagem branca; o teste da navbar confere.
- Luz "limelight": uma peça só, sobre o chip, centrada na aba ativa. Barra de 1px exatamente sobre a borda de cima do chip, que some nas pontas (`bg-limelight-bar`) e tem halo (`drop-shadow-limelight`); colado a ela, o cone e a luz que derrama sobre o chip (`shadow-limelight`) e, dentro dela, o cone (`bg-limelight`, `clip-limelight`) que passa das bordas do chip e se desfaz. Sempre paper, nunca `signal`. As abas têm a mesma largura (`--spacing-nav-tab`) e a posição vem do índice `--nav-index`, definido pela prop `current`. Ela desliza entre páginas com o `ViewTransition` do React (400 ms); sem suporte do navegador aparece no lugar, e com `prefers-reduced-motion` nada desliza.
- Chip largo (até `--container-navbar`; no celular, a tela menos as margens): a marca e as abas dividem o chip em partes iguais, cada uma centrada na sua parte.
- Abas inativas em `soft`; no hover só sobem para `paper`, sem fundo nem contorno (exceção à regra do hover dos controles: no chip de vidro o contorno pesava). A ativa não muda.
- Componente de servidor, sem JS novo no cliente: a página passa `current` e a navbar marca `aria-current="page"`.
- Aparece só no Início e no Sobre. Fora da tela do título (Dock), da sala de grupo e da busca. Camadas: navbar `z-nav` (1) abaixo do painel de filtros (2), do Dock (10), da busca e do aviso (20).
- Respiro: `[data-nav]` dá à página `--spacing-nav` embaixo no celular e `scroll-padding-top` no computador, para a navbar não cobrir conteúdo nem o foco.

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
