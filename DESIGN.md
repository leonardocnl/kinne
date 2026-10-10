# Design do Kinne

Leitura obrigatória antes de qualquer tarefa de interface. A fonte da verdade visual é a maquete aprovada, `docs/design/maquete-kinnemix.html`. Os tokens estão em `src/app/globals.css`, os componentes em `src/app/_components/ui/` e a referência viva em `/design`.

## Tokens

- Só tokens. Fora do `globals.css` é proibido usar hex, px ou valores arbitrários do Tailwind (`bg-[#123]`, `text-[17px]`, `w-(--x)`, `[&_svg]:…`). O teste `src/app/design-tokens.test.ts` falha se aparecer algum.
- A escala numérica do Tailwind (`gap-3.5`, `px-5.5`, `opacity-80`, `scale-98`) vale, porque deriva dos tokens.
- Valor novo entra primeiro como token no `@theme`, com nome e comentário dizendo onde se usa.
- Celular vai até 860px. Use `max-desktop:` para o celular e `desktop:` para o computador.

## Cor

- O amarelo (`signal`) aparece só no controle mais importante de cada tela e na wordmark. Um amarelo por tela.
- No hover, todo controle segue o do quiet: fundo `hover` e borda `line-strong`. Nenhum controle ganha cor nova no hover. O primary não muda de cor; só encolhe ao ser pressionado. O chip marcado não muda.

## Forma

- Todo controle tocável é pílula (`rounded-pill`). Botão só de ícone é círculo (`Button variant="round"`, com `aria-label`).
- O que não se toca nunca é pílula. A nota, por exemplo, é texto.
- Única exceção: o skeleton imita a forma do que vai substituir (imagem reta, botão e linhas de texto em pílula, título com `rounded-card`).
- Imagens de filmes e séries têm cantos retos.

## Componentes

- Componente novo só entra se for adicionado em `_components/ui` e na página `/design`.
- Nada de componentes ou props que nenhuma tela use.

## Acessibilidade

WCAG 2.2 AA, mais estes critérios AAA do projeto:

- Contraste de 7:1 no texto.
- Alvo de toque de no mínimo 44px (`h-target`). Controles têm 50px (`h-control`).
- Foco sempre visível (contorno claro, definido no `globals.css`).
- Movimento reduzido: com `prefers-reduced-motion`, nada se move nem pulsa (`motion-reduce:`).
- Texto corrido com até 80 caracteres por linha (`max-w-measure`).
