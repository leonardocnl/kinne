# Prompt — Etapa 3: sala de grupo

Cole o texto abaixo numa sessão nova do Claude Code na nuvem, com o repositório `leonardocnl/kinne`, depois que o PR da etapa 2 estiver pronto.

---

Você vai implementar a sala de grupo do Kinne: a história US011.

**Contexto.** O grafo de gosto está no PR #26 (`feat/taste-graph`) e as telas de gosto e sentimentos no PR da etapa 2 (`feat/taste-ui`). Nenhum dos dois foi mesclado.

**Leia antes de qualquer código, nesta ordem:**

1. `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` e `docs/security.md`.
2. `docs/design/taste-graph.md` §7 e §8.
3. `docs/requisitos/us011-sala-de-grupo.md` e as histórias que ela cita.
4. `docs/threats/group-room.md` (todas as mitigações **AC** viram teste ou verificação automática) e `docs/threats/feelings-and-taste-ui.md` A3.
5. `src/domain/taste-graph.ts` (`spreadTaste`, `groupScores`), `src/infrastructure/db/rate-limiter.ts`, `src/infrastructure/db/schema.ts`, `drizzle/0009_taste_graph.sql` (formato de migration com permissões dos papéis).

**Como trabalhar:**

- Crie a branch `feat/group-room` a partir de `origin/feat/taste-ui` e abra o PR como **rascunho** com base em `feat/taste-ui`. Não mescle nada.
- Primeiro proponha e mostre a modelagem das tabelas (`group_rooms`, `group_room_members`, `group_room_finalists`, `group_room_votes`), com tipos, chaves, índices e as permissões de `kinne_app`. **Espere aprovação** antes de escrever a migration.
- A migration nova segue o padrão da 0009: SQL e snapshot do drizzle-kit (rode `npm run db:generate`), com os `GRANT` mínimos. Não aplique em nenhum banco; quem aplica é o dono do projeto.
- Domínio puro em `src/domain/group-room.ts` (fases, código, finalistas, vencedor), com testes; casos de uso em `application`; ações em `src/app/_actions/`.
- Nenhum query param; o código só no caminho do QR e trocado por `/sala` logo ao entrar. Cookie de membro conforme a ameaça A2. Gere o QR code sem dependência nova se possível; se precisar de uma, **pergunte antes**.
- Interface: siga o DESIGN.md; foco em fazer existir.
- Antes de cada commit: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- Se um requisito parecer contraditório ou incompleto, **pare e pergunte**.
- No fim: checklist de segurança do PR preenchido e a lista do que foi verificado e do que não foi.
