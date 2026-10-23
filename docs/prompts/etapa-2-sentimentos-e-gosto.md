# Prompt — Etapa 2: sentimentos, gosto invisível e "Curtiu?"

Cole o texto abaixo numa sessão nova do Claude Code na nuvem, com o repositório `leonardocnl/kinne`.

---

Você vai implementar a etapa 2 do grafo de gosto do Kinne: as histórias US008 (Escolher pelo que sinto), US009 (Gosto invisível) e US010 (Curtiu?).

**Contexto.** A etapa 1 está no PR #26 (branch `feat/taste-graph`): grafo de vizinhos mais próximos, sentimentos, piso com gosto, `graph:build` e gabarito. Nada da etapa 1 é lido pelas telas ainda. A migration 0009 já foi aplicada no banco develop.

**Leia antes de qualquer código, nesta ordem:**

1. `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` e `docs/security.md`.
2. `docs/design/taste-graph.md` (o modelo aprovado) e `docs/requisitos/04-mudancas-e-pendencias.md` (seção de 23/10/2026).
3. `docs/requisitos/us008-escolher-pelo-que-sinto.md`, `us009-gosto-invisivel.md`, `us010-curtiu.md` e as histórias que elas citam (US002, US003, US005).
4. `docs/threats/feelings-and-taste-ui.md`, `taste-graph.md` e `taste-graph-data.md`.
5. O código de `src/domain/taste-graph.ts`, `src/domain/feelings.ts`, `src/app/_actions/filters.ts`, `src/app/_actions/surprise.ts`, `src/app/_data/` e `src/infrastructure/browser-storage.ts`.

**Como trabalhar:**

- Crie a branch `feat/taste-ui` a partir de `origin/feat/taste-graph` e abra o PR como **rascunho** com base em `feat/taste-graph`.
- Ordem: US010 (menor) → US008 → US009. Um commit por critério ou grupo pequeno de critérios, citando o critério (ex.: `feat(feelings): feeling chips in filters (US008 C1)`).
- Cada mitigação marcada **AC** nos modelos de ameaças vira teste. Os schemas zod são estritos.
- Interface: siga o DESIGN.md e o estilo existente (chips, painel de vidro, só um controle amarelo por tela). Foco em fazer existir: nada de refino visual além do necessário para ficar coerente com o que já existe.
- O grafo no servidor: carregue `title_neighbors` com `'use cache: remote'` nas tags do catálogo e faça o `graph:build` pedir revalidação pelo endpoint existente (`requestRevalidation`) ao terminar.
- Antes de cada commit: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- Se um requisito parecer contraditório, incompleto ou contrariar o código existente, **pare e pergunte**, sem decidir sozinho. Pontos já sabidos em aberto estão em `04-mudancas-e-pendencias.md`, seção "Grafo de gosto".
- No fim: preencha o checklist de segurança do PR, rode `npm run feelings:calibrate` se tiver acesso ao banco (senão, diga que não rodou) e liste o que foi verificado e o que não foi.
