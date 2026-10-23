# Prompt — Etapas 2 e 3 numa sessão só

Cole o texto abaixo numa sessão nova do Claude Code na nuvem, com o repositório `leonardocnl/kinne`. Substitui os dois prompts separados desta pasta.

---

Você vai implementar, em sequência, a etapa 2 (US008 Escolher pelo que sinto, US009 Gosto invisível, US010 Curtiu?) e a etapa 3 (US011 Sala de grupo) do grafo de gosto do Kinne.

## Contexto

A etapa 1 está no PR #26 (branch `feat/taste-graph`): grafo de vizinhos mais próximos, sentimentos, piso com gosto, `graph:build`, gabarito, e os requisitos e modelos de ameaças das etapas 2 e 3. A migration 0009 já foi aplicada no banco develop. Nenhuma tela lê o grafo ainda.

## Decisões do dono do projeto (23/10/2026)

Valem como aprovadas. Ao começar, atualize os documentos para refletir isso: troque o status de US008, US009, US010 e US011 para "aprovada em 23/10/2026", e marque como resolvidos os itens correspondentes em `docs/requisitos/04-mudancas-e-pendencias.md`, seção "Grafo de gosto".

1. US008 a US011 e os modelos de ameaças `feelings-and-taste-ui.md` e `group-room.md` estão aprovados como escritos.
2. **Não** entra botão "Não me interessa" nesta versão: o gosto usa só curti, não curti e vou assistir.
3. Na sala, cada pessoa marca só streamings e gêneros, sem veto de título.
4. Na sala, pessoas aparecem sem nome ("Pessoa 1", "Pessoa 2"…).
5. Na sala, os streamings valem em união: basta um membro ter.

## Leia antes de qualquer código, nesta ordem

1. `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` e `docs/security.md`.
2. `docs/design/taste-graph.md` (o modelo aprovado) e `docs/requisitos/04-mudancas-e-pendencias.md` (seções de 23/10/2026).
3. `docs/requisitos/us008-escolher-pelo-que-sinto.md`, `us009-gosto-invisivel.md`, `us010-curtiu.md`, `us011-sala-de-grupo.md` e as histórias que elas citam (US002, US003, US004, US005).
4. `docs/threats/feelings-and-taste-ui.md`, `group-room.md`, `taste-graph.md` e `taste-graph-data.md`.
5. O código de `src/domain/taste-graph.ts`, `src/domain/feelings.ts`, `src/app/_actions/`, `src/app/_data/`, `src/infrastructure/browser-storage.ts`, `src/infrastructure/db/rate-limiter.ts`, `src/infrastructure/db/schema.ts` e `drizzle/0009_taste_graph.sql`.

## Etapa 2 — branch `feat/taste-ui`

- Crie `feat/taste-ui` a partir de `origin/feat/taste-graph`; abra o PR como **rascunho** com base em `feat/taste-graph`.
- Ordem: US010 → US008 → US009.
- O grafo no servidor fica num módulo só, `src/app/_data/taste-graph.ts`, exportando `neighborGraph()` com `'use cache: remote'` nas tags do catálogo. Ao terminar, o `graph:build` pede revalidação pelo endpoint existente (`requestRevalidation`).
- Ao fim da etapa 2, faça push e **mostre um resumo** (o que foi feito, o que foi verificado, o que não foi) antes de seguir para a etapa 3.

## Etapa 3 — branch `feat/group-room`

- Crie `feat/group-room` a partir de `feat/taste-ui`; abra o PR como **rascunho** com base em `feat/taste-ui`.
- Use o mesmo `neighborGraph()` da etapa 2; não crie outro carregamento.
- **Primeiro mostre a modelagem das tabelas** (`group_rooms`, `group_room_members`, `group_room_finalists`, `group_room_votes`): tipos, chaves, índices e permissões de `kinne_app` e `kinne_sync`. **Espere aprovação** antes de escrever a migration.
- A migration segue o padrão da 0009: SQL e snapshot gerados com `npm run db:generate`, com os `GRANT` mínimos. Não aplique em nenhum banco; quem aplica é o dono do projeto.
- Domínio puro em `src/domain/group-room.ts` (fases, código, finalistas, vencedor), com testes; casos de uso em `application`; ações em `src/app/_actions/`.
- Gere o QR code sem dependência nova, se possível; se precisar de uma, **pergunte antes**.

## Regras para as duas etapas

- Um commit por critério ou grupo pequeno de critérios, citando o critério (ex.: `feat(feelings): feeling chips in filters (US008 C1)`).
- Cada mitigação marcada **AC** nos modelos de ameaças vira teste ou verificação automática. Schemas zod estritos. Nenhum query param; na sala, o código só no caminho do QR, trocado por `/sala` logo ao entrar.
- Interface: siga o DESIGN.md e o estilo existente (chips, painel de vidro, um só controle amarelo por tela). Foco em fazer existir: nada de refino visual além do necessário para ficar coerente.
- Antes de cada commit: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- Se um requisito parecer contraditório, incompleto ou contrariar o código existente, **pare e pergunte**, sem decidir sozinho.
- No fim de cada etapa: checklist de segurança do PR preenchido; rode `npm run feelings:calibrate` se tiver acesso ao banco (senão, diga que não rodou); liste o que foi verificado e o que não foi.
