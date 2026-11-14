# Kinne — instruções para o Claude

@AGENTS.md

App web que recomenda um filme ou série por vez, só entre os streamings por assinatura que a pessoa tem no Brasil (Netflix, Max, Prime Video, Disney+, Globoplay). Dados do TMDB. O MVP está no ar; o trabalho atual segue o [plano de fundação](docs/plano-fundacao.md).

## Leia antes de começar

| Tarefa                                                | Leia                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qualquer código                                       | A skill [`kinne-standards`](.claude/skills/kinne-standards/SKILL.md): módulos, fronteiras, eventos, banco, padrão das actions, design system, o que é slop    |
| Interface                                             | [DESIGN.md](DESIGN.md), sempre                                                                                                                                |
| Produto                                               | [docs/requisitos/README.md](docs/requisitos/README.md) e as histórias citadas no pedido. A fonte da verdade é o Google Drive; `docs/requisitos/` é uma cópia  |
| Entrada de dados, rotas, segredos, dependências ou CI | [docs/security.md](docs/security.md)                                                                                                                          |
| Arquitetura e o porquê das decisões                   | [docs/architecture/overview.md](docs/architecture/overview.md), [boundaries.md](docs/architecture/boundaries.md) e os [ADRs](docs/architecture/adr/README.md) |

## Regras que valem sempre

- **Autoria:** commits e PRs só em nome do Leonardo. Nunca adicionar `Co-Authored-By`, "Generated with Claude Code" ou qualquer linha de autoria do Claude, em commit, PR ou código.
- **Formatação:** indentação de 4 espaços, linhas de até 100 caracteres. O Prettier é a fonte da verdade (`.prettierrc.json`); o ESLint não cuida de formatação.
- **Idioma:** código, nomes de arquivos, comentários, commits, ADRs e guias em inglês. Requisitos e textos da interface em pt-BR.
- **Segurança vence a régua de código mínimo:** validação zod, `server-only`, CSP, headers, limites de requisição e checagens de sessão nunca são removidos como "slop" ou "código desnecessário". Na dúvida, pergunte.
- **Gosto, produto, prioridade e escopo** são decisões do Leonardo: pergunte, com opções e uma recomendação. Se o código precisar contrariar um requisito, pare e pergunte.
- **Dependências:** não adicionar nenhuma sem perguntar.
- **Mover antes de mudar:** refatoração estrutural não altera comportamento; os testes continuam verdes mudando só os imports.
- **Decisões fixas (não mudar sem perguntar):** Node 24 (`.nvmrc`); Next.js (App Router), React, TypeScript strict, Tailwind CSS, Vitest; Postgres no Neon com Drizzle e o driver HTTP `@neondatabase/serverless`; Vercel sem recursos exclusivos dela (nada de Vercel KV, Postgres, Blob ou Cron: o que é agendado roda no GitHub Actions); segredos só em variáveis de ambiente (`.env.example`), e `.env.local` nunca vai para o Git nem é aberto ou impresso.
- **Estrutura atual:** o código ainda está em camadas (`src/domain`, `src/application`, `src/infrastructure`, `src/app`), com dependências só para dentro. A migração para `src/modules/*` é a F2 do plano; a skill explica o que fazer até lá.
- **README:** manter a frase de atribuição do TMDB. Sem licença (todos os direitos reservados); não criar LICENSE.
- Cite os critérios nos commits quando fizer sentido, ex.: `feat(home): rotate daily picks (US001 C2)`.

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
- **Banco:** até o Leonardo confirmar para onde aponta o `DATABASE_URL` do `.env.local`, o `banco` só usa `db:generate` e `test:db`.
- **Caminhos:** os agentes usam a estrutura atual em camadas. No fim da F2, a brigada precisa ser atualizada com os caminhos novos.
- Os agentes terminam com `## Questions for Leonardo` quando a decisão não é deles.

## Security

Regras inegociáveis (exceção só registrada em "Accepted risks" do [docs/security.md](docs/security.md)):

- Nenhum query param em URLs; a URL leva só o caminho. Estado transitório vai em `sessionStorage` ou `history.state`.
- Nenhum segredo em código de cliente: módulos com segredo ou banco importam `server-only`, e nenhum segredo usa o prefixo `NEXT_PUBLIC_`.
- Schemas zod estritos (chaves desconhecidas rejeitadas) em toda server action.
- Nenhuma saída de console em produção.
- Nada de `dangerouslySetInnerHTML`.
- Erros para o usuário sempre genéricos; detalhe só no log do servidor.
- Todo PR preenche o checklist de segurança do template.
