# Kinne

Chega de rolar catálogo: o Kinne indica um filme ou série por vez, só entre o que está nos streamings que você assina no Brasil. Indicações do dia, filtros rápidos e sorteio, com dados do TMDB.

## Stack

- Next.js 16 (App Router), React 19 e TypeScript (strict), em Node 24
- Tailwind CSS 4
- Postgres no Neon, com Drizzle ORM e o driver HTTP `@neondatabase/serverless`
- Resend para os e-mails com código de entrada
- Hospedagem na Vercel; atualização diária do catálogo no GitHub Actions
- ESLint, Prettier, Vitest e Playwright

## Como rodar localmente

Requer Node 24 (veja `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

Abra http://localhost:3000.

## Scripts

| Script                               | O que faz                                                              |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `npm run dev`                        | Servidor de desenvolvimento                                            |
| `npm run build`                      | Build de produção                                                      |
| `npm run start`                      | Sobe o build de produção                                               |
| `npm run lint`                       | ESLint                                                                 |
| `npm run format`                     | Formata o código com Prettier                                          |
| `npm run format:check`               | Confere a formatação sem alterar arquivos                              |
| `npm run typecheck`                  | Gera os tipos das rotas e checa os tipos                               |
| `npm test`                           | Testes com Vitest                                                      |
| `npm run test:e2e`                   | Cabeçalhos e CSP no app construído (pede `build` e Chromium)           |
| `npm run test:visual`                | Capturas de tela com Playwright (pede `build`)                         |
| `npm run test:db`                    | Testes das contas num Postgres real                                    |
| `npm run bundle:check`               | Orçamento de JS da tela inicial e varredura de segredos (pede `build`) |
| `npm run db:generate`                | Gera uma migration com o Drizzle                                       |
| `npm run db:migrate`                 | Aplica as migrations                                                   |
| `npm run db:migrate:guard`           | Recusa rodar fora do banco de `develop`                                |
| `npm run db:migrate:verify`          | Confere as migrations aplicadas em `develop`                           |
| `npm run db:seed`                    | Grava os dados fixos (streamings e gêneros)                            |
| `npm run catalog:sync`               | Carga do catálogo a partir do TMDB                                     |
| `npm run graph:build`                | Monta o grafo de gosto                                                 |
| `npm run daily:pick`                 | Gera as indicações do dia                                              |
| `npm run events:delete`              | Apaga os eventos de teste (RNF10)                                      |
| `npm run smoke:title`                | Teste rápido da tela do título                                         |
| `npm run search:check-normalization` | Confere a normalização da busca                                        |
| `npm run feelings:calibrate`         | Calibra os sentimentos                                                 |

## Páginas públicas

- `/sobre`: por que o Kinne existe, resumo de privacidade, perguntas frequentes, apoio por Pix e créditos.
- `/privacidade`: texto de privacidade (rascunho).

O rodapé de toda página leva a elas e ao contato. O QR code Pix é um arquivo fixo (`public/pix-qr.svg`), gerado de `src/domain/pix.ts` por `scripts/generate-pix-qr.py`.

## Documentação

| Caminho                      | O que tem                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| `CLAUDE.md`, `AGENTS.md`     | Decisões do projeto e instruções para agentes              |
| `DESIGN.md`                  | Regras do design system (a maquete está em `docs/design/`) |
| `docs/requisitos/`           | Cópia dos requisitos e histórias de usuário                |
| `docs/security.md`           | Regras de segurança e riscos aceitos                       |
| `docs/threats/`              | Análises de ameaças por funcionalidade                     |
| `docs/plano-fundacao.md`     | Plano de fundação pós-MVP, com as fases                    |
| `docs/baseline.md`           | Métricas de referência: testes, build, bundle e Lighthouse |
| `docs/refinements.md`        | Refinos visuais pendentes                                  |
| `docs/release-checklist.md`  | Passos para levar o `develop` à produção                   |
| `docs/readiness.md`          | Auditoria do modo visitante antes do teste com usuários    |
| `docs/design/taste-graph.md` | Modelagem do grafo de gosto                                |
| `docs/prompts/`              | Prompts usados nas etapas de construção                    |

## Atribuição

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.

## Licença

Todos os direitos reservados.
