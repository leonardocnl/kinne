# Prompt — Contas (US012 a US015)

Cole o texto abaixo numa sessão nova do Claude Code na nuvem, com o repositório `leonardocnl/kinne`.

---

Você vai implementar as contas do Kinne: entrar com código no e-mail, onboarding, perfil e meus dados, e o gosto na conta (histórias US012, US013, US014 e US015).

## Decisões do dono do projeto (23/10/2026)

Já aprovadas; estão nas histórias:

1. Login por **código de 6 dígitos no e-mail**, não magic link (nada secreto na URL).
2. Envio pelo **Resend**. O domínio ainda não existe: construa com um envio de desenvolvimento que escreve o código no terminal, **impossível de ativar em produção** (ameaças C3). O Resend entra atrás da mesma interface, ligado por `RESEND_API_KEY`.
3. **Implementação própria**, só com o `crypto` do Node; nenhuma biblioteca de autenticação.
4. Sessão de **30 dias renovando com o uso, teto de 90**.
5. Onboarding **pulável**, aproveitando o que o navegador já tem.
6. Ao sair, o navegador **apaga** gosto, "Já vi" e streamings.
7. Sentimentos passam a ser **só de quem tem conta**, com convite para o visitante.
8. Perfil como em US014, sem nome nem apelido.

## Leia antes de qualquer código, nesta ordem

1. `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` e `docs/security.md` (principalmente §12 e §13).
2. `docs/requisitos/us012-entrar-com-codigo.md`, `us013-onboarding.md`, `us014-perfil-e-meus-dados.md`, `us015-gosto-na-conta.md` e as que elas citam (US001, US008, US009, US010).
3. `docs/threats/accounts.md` inteiro, incluindo a seção "Attack tests".
4. O código de `src/infrastructure/browser-storage.ts`, `src/app/_actions/`, `src/app/_data/`, `src/infrastructure/db/schema.ts`, `src/infrastructure/db/rate-limiter.ts`, `drizzle/0009_taste_graph.sql` (padrão de migration com permissões) e o PR #28 (sala de grupo: cookie de membro com hash, um bom modelo do que se pede aqui).

## Como trabalhar

- Crie a branch `feat/accounts` a partir de `origin/docs/accounts` (que é o `develop` mais estas histórias e o modelo de ameaças). Abra o PR como **rascunho** para `develop`; ele leva os documentos junto. Não mescle.
- **Primeiro**, mostre a modelagem das tabelas (contas, códigos, sessões, streamings, sinais, "Já vi", progresso do onboarding): tipos, chaves, índices, o que é guardado só como hash, e as permissões de `kinne_app` e `kinne_sync`, coluna a coluna quando fizer sentido. **Espere aprovação** antes de escrever a migration. Gere a migration com `npm run db:generate` e não aplique em banco nenhum.
- Ordem sugerida: domínio (código, sessão, regras de junção de US015) → migration → entrar e sair (US012) → gosto na conta (US015) → onboarding (US013) → perfil, baixar e apagar (US014) → texto de privacidade (rascunho, US014 RNE003).
- **Os dez testes de ataque** de `docs/threats/accounts.md` são obrigatórios e chamam as ações de verdade com entradas forjadas. Cada mitigação marcada **AC** vira teste.
- Dependência nova só com pergunta antes. O envio pelo Resend pode ser uma chamada HTTP comum, sem pacote.
- Interface: siga o DESIGN.md e o estilo existente; um só controle amarelo por tela; foco em fazer existir, sem refino visual.
- Antes de cada commit: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
- Se um requisito parecer contraditório ou incompleto, **pare e pergunte**.
- **Ao mesclar qualquer PR**, nunca use `--delete-branch` se outro PR estiver empilhado sobre a branch: reaponte o outro antes.
- No fim: checklist de segurança do PR preenchido; a lista dos testes de ataque com o resultado de cada um; o que foi verificado e o que não foi.
