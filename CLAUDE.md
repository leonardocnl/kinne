# Kinne — instruções para o Claude

@AGENTS.md

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
- **Fontes** (via `next/font/google`): Darker Grotesque peso 500 nos títulos (`font-display`) e Manrope na interface (`font-sans`).
- **Cores** (tokens do Tailwind em `src/app/globals.css`): fundo `#020202` (`background`), texto `#F2F2EE` (`foreground`), destaque `#FFF340` (`accent`), este usado só no controle principal de cada tela.
- **Idioma:** interface em pt-BR. Código, nomes de arquivos e commits em inglês; comentários podem ser em português.
- **Dependências:** não adicionar nenhuma sem perguntar.
- **README:** manter a frase de atribuição do TMDB. Sem licença (todos os direitos reservados); não criar LICENSE.

## Antes de commitar

`npm run lint && npm run typecheck && npm test && npm run build` precisam passar.
