# Kinne — instruções para o Claude

@AGENTS.md

**Antes de qualquer tarefa de interface, leia [DESIGN.md](DESIGN.md)** (regras do design system).

App web que recomenda um filme ou série por vez, só entre os streamings por assinatura que a pessoa tem no Brasil (Netflix, Max, Prime Video, Disney+, Globoplay). Dados do TMDB. Fase 1: "modo visitante" (sem login), prazo até 25/10/2026.

## Decisões (não mudar sem perguntar ao usuário)

- **Runtime:** Node 24 (`.nvmrc`, `engines.node: "24.x"`). `@types/node` acompanha a versão do Node (hoje `^24`).
- **Stack:** Next.js (App Router), React, TypeScript strict, Tailwind CSS, ESLint, Vitest.
- **Banco:** Postgres no Neon, via Drizzle ORM e o driver HTTP `@neondatabase/serverless`. (Ainda não configurado.)
- **Hospedagem:** Vercel, mas sem recursos exclusivos dela (nada de Vercel KV, Postgres, Blob ou Cron). A atualização diária do catálogo roda no GitHub Actions.
- **Arquitetura em camadas em `src/`:**
  - `domain`: regras puras, sem dependência de framework.
  - `application`: casos de uso.
  - `infrastructure`: TMDB, banco, armazenamento do navegador.
  - `app`: rotas e componentes do Next.
  - Dependências só apontam para dentro: app → application → domain. A infrastructure implementa interfaces definidas em domain/application.
- **Segredos:** só em variáveis de ambiente (veja `.env.example`). `.env.local` nunca vai para o Git.
- **Fontes** (via `next/font/google`): Darker Grotesque peso 500 nos títulos (`font-display`) e Manrope na interface (`font-ui`).
- **Cores** (tokens do Tailwind em `src/app/globals.css`): fundo `#020202` (`ink`), texto `#F2F2EE` (`paper`), destaque `#FFF340` (`signal`), este usado só no controle principal de cada tela e na wordmark. Todos os tokens e regras visuais estão no DESIGN.md.
- **Idioma:** interface em pt-BR. Código, nomes de arquivos e commits em inglês; comentários podem ser em português.
- **Formatação:** o Prettier é a fonte da verdade (`.prettierrc.json`). Indentação de 4 espaços, linhas de até 100 caracteres. O ESLint não cuida de formatação (`eslint-config-prettier`).
- **Dependências:** não adicionar nenhuma sem perguntar.
- **README:** manter a frase de atribuição do TMDB. Sem licença (todos os direitos reservados); não criar LICENSE.

## Requisitos

- Antes de qualquer tarefa de produto, leia [docs/requisitos/README.md](docs/requisitos/README.md) e as histórias citadas no pedido. A fonte da verdade é o Google Drive; `docs/requisitos/` é uma cópia.
- Cite os critérios nos commits quando fizer sentido, ex.: `feat(home): rotate daily picks (US001 C2)`.
- Se o código precisar contrariar um requisito, pare e pergunte em vez de decidir sozinho.

## Antes de commitar

`npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` precisam passar.

## Branch workflow

- `main` = production. Never push to it directly.
- `develop` = integration. Never push to it directly; it only changes through merged PRs.
- `feat/…`, `fix/…`, `docs/…` = short-lived task branches, one per task, in kebab-case (e.g. `feat/analytics-events`). Branch off `develop` and open the PR into `develop`.

## Security

Leia [docs/security.md](docs/security.md) antes de qualquer tarefa que mexa em entrada de dados, rotas, segredos, dependências ou CI. Regras inegociáveis (exceção só registrada em "Accepted risks"):

- Nenhum query param em URLs; a URL leva só o caminho. Estado transitório vai em `sessionStorage` ou `history.state`.
- Nenhum segredo em código de cliente: módulos com segredo ou banco importam `server-only`, e nenhum segredo usa o prefixo `NEXT_PUBLIC_`.
- Schemas zod estritos (chaves desconhecidas rejeitadas) em toda server action.
- Nenhuma saída de console em produção.
- Nada de `dangerouslySetInnerHTML`.
- Erros para o usuário sempre genéricos; detalhe só no log do servidor.
- Todo PR preenche o checklist de segurança do template.
