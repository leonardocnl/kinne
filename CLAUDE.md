# Kinne — instruções para o Claude

@AGENTS.md

**Antes de qualquer tarefa de interface, leia [DESIGN.md](DESIGN.md)** (regras do design system).

App web que recomenda um filme ou série por vez, só entre os streamings por assinatura que a pessoa tem no Brasil (Netflix, Max, Prime Video, Disney+, Globoplay). Dados do TMDB. A fase 1 ("modo visitante", sem login) tinha prazo até 25/10/2026; o pós-MVP (contas com código por e-mail, sala de grupo, gosto) segue as histórias em `docs/requisitos/` e o [plano de fundação](docs/plano-fundacao.md).

## Decisões (não mudar sem perguntar ao usuário)

- **Runtime:** Node 24 (`.nvmrc`, `engines.node: "24.x"`). `@types/node` acompanha a versão do Node (hoje `^24`).
- **Stack:** Next.js (App Router), React, TypeScript strict, Tailwind CSS, ESLint, Vitest.
- **Banco:** Postgres no Neon, via Drizzle ORM e o driver HTTP `@neondatabase/serverless`. Schema em `src/infrastructure/db/schema.ts`, migrations em `drizzle/` (aplicadas no banco `develop` pelo workflow `migrate-develop.yml`).
- **Hospedagem:** Vercel, mas sem recursos exclusivos dela (nada de Vercel KV, Postgres, Blob ou Cron). A atualização diária do catálogo roda no GitHub Actions.
- **Arquitetura em camadas em `src/`:**
  - `domain`: regras puras, sem dependência de framework.
  - `application`: casos de uso.
  - `infrastructure`: TMDB, banco, autenticação (código por e-mail via Resend), HTTP, armazenamento do navegador.
  - `app`: rotas e componentes do Next.
  - Dependências só apontam para dentro: app → application → domain. A infrastructure implementa interfaces definidas em domain/application.
- **Segredos:** só em variáveis de ambiente (veja `.env.example`). `.env.local` nunca vai para o Git.
- **Fontes** (via `next/font/google`): Darker Grotesque peso 500 nos títulos (`font-display`) e Manrope na interface (`font-ui`).
- **Cores** (tokens do Tailwind em `src/app/globals.css`): fundo `#020202` (`ink`), texto `#F2F2EE` (`paper`), destaque `#FFDF25` (`signal`), este usado só no controle principal de cada tela e no ícone da marca. Todos os tokens e regras visuais estão no DESIGN.md.
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
- `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…`, `ci/…`, `test/…` = short-lived task branches, one per task, in kebab-case (e.g. `feat/analytics-events`). Branch off an up-to-date `develop` and open the PR into `develop`.
- Never skip the git hooks in `.githooks/` (no `--no-verify`).

## Brigada

Agentes do projeto em `.claude/agents/` (skills em `.claude/skills/`), adaptados do padrão `leonardocnl/riddere`. O arquiteto (global) planeja e distribui as tarefas; ordem típica: banco → algoritmo → dev → ui-ux → testes → requisitos → revisor → docs → git.

| Agente       | Modelo         | Quando usar                                                                         |
| ------------ | -------------- | ----------------------------------------------------------------------------------- |
| `dev`        | sonnet         | Implementar uma tarefa do plano: lógica, server actions, ligação entre camadas      |
| `ui-ux`      | sonnet         | Telas, componentes, texto na tela, movimento, acessibilidade, DESIGN.md             |
| `banco`      | sonnet         | Schema, migrations, papéis e funções do Postgres                                    |
| `algoritmo`  | sonnet         | Grafo de gosto, sentimentos, sorteio, indicações do dia, conflitos de gênero, busca |
| `devops`     | sonnet         | GitHub Actions, jobs agendados, rulesets, Vercel, Dependabot                        |
| `revisor`    | sonnet         | Revisar o diff (bugs e segurança) antes de commit ou PR; só lê (security §16.5)     |
| `testes`     | haiku → sonnet | Escrever e rodar testes automatizados                                               |
| `requisitos` | haiku          | Conferir critérios de aceitação contra o código e os testes                         |
| `docs`       | haiku          | README, docs/, análises de ameaça aprovadas em `docs/threats/`                      |
| `git`        | haiku          | Branches, commits, push de branch de tarefa e PR para `develop`                     |

- **Escalada do `testes`:** ele roda no haiku. Se responder `ESCALATE: <motivo>`, chame-o de novo com o modelo `sonnet`, passando o motivo e o que já foi tentado.
- **Análise de ameaças:** o arquiteto usa a skill `threat-analysis` ao planejar cada história (security §16.1); depois da aprovação, o `docs` grava o resultado em `docs/threats/`.
- **Testes visuais:** por enquanto nenhum agente roda `test:visual` nem `test:visual:update`.
- **Banco:** até o Leonardo confirmar para onde aponta o `DATABASE_URL` do `.env.local`, o `banco` só usa `db:generate` e `test:db`. Nenhum agente abre ou imprime `.env.local`.
- **Caminhos:** os agentes usam a estrutura atual (`src/domain`, `src/application`, `src/infrastructure`, `src/app`). No fim da F2 do plano de fundação (`src/modules/*`, `src/shared/*`), a brigada precisa ser atualizada com os caminhos novos.
- Os agentes não decidem gosto, produto, prioridade ou escopo: terminam com `## Questions for Leonardo`. Commits e PRs só em nome do Leonardo, sem `Co-Authored-By` nem "Generated with Claude Code".

## Security

Leia [docs/security.md](docs/security.md) antes de qualquer tarefa que mexa em entrada de dados, rotas, segredos, dependências ou CI. Regras inegociáveis (exceção só registrada em "Accepted risks"):

- Nenhum query param em URLs; a URL leva só o caminho. Estado transitório vai em `sessionStorage` ou `history.state`.
- Nenhum segredo em código de cliente: módulos com segredo ou banco importam `server-only`, e nenhum segredo usa o prefixo `NEXT_PUBLIC_`.
- Schemas zod estritos (chaves desconhecidas rejeitadas) em toda server action.
- Nenhuma saída de console em produção.
- Nada de `dangerouslySetInnerHTML`.
- Erros para o usuário sempre genéricos; detalhe só no log do servidor.
- Todo PR preenche o checklist de segurança do template.
