# Kinne: plano de fundação pós-MVP

> Substitui o `PLANO-FUNDACAO-KINNE.md`. Resultado da entrevista de arquitetura de 01/11/2026.
> Coloque este arquivo na raiz do repositório `leonardocnl/kinne`. Cada fase tem um prompt pronto para colar no Claude Code local.

## Como usar

1. Salve este arquivo em `docs/plano-fundacao.md` (ou na raiz) e faça commit numa branch `docs/foundation-plan`.
2. Execute as fases **na ordem**, uma por vez, colando o prompt da fase no Claude Code.
3. Cada fase termina com PRs para `develop`. Só passe para a próxima quando os PRs da anterior estiverem integrados.

## Regras que valem para todas as fases

Todo prompt abaixo assume estas regras. Elas também devem entrar no `CLAUDE.md` na F1.

- **Autoria:** commits e PRs **só em nome do Leonardo**. Nunca adicionar `Co-Authored-By`, "Generated with Claude Code" ou qualquer linha de autoria do Claude, em commit, PR ou código.
- **Indentação de 4 espaços** em todo código (ajustar Prettier e EditorConfig se ainda estiverem em 2).
- **Branches:** a partir de `develop`, uma por tarefa (`feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…`, kebab-case). Nunca push direto em `main` ou `develop`.
- **Mover antes de mudar:** refatoração estrutural não altera comportamento. Testes existentes continuam verdes sem editar asserts, exceto imports.
- **Segurança vence tudo:** validação zod, `server-only`, CSP, headers, limites de requisição e checagens de sessão nunca são removidos como "slop" ou "código mínimo". Na dúvida, perguntar.
- **Nada na URL, nada no console:** nenhum dado em parâmetro de URL; nenhuma saída de console no navegador em produção.
- **Dependência nova:** só as já aprovadas neste plano (`dependency-cruiser`, `@playwright/test` se ainda não houver). Qualquer outra, perguntar.
- **Idioma:** código, commits, READMEs de módulo, ADRs, guias e comentários em **inglês**. Requisitos (`docs/requisitos/`) e textos da interface em **português**.
- **Next.js 16:** consultar `node_modules/next/dist/docs/` antes de mexer em roteamento, cache ou server actions.
- **Antes de cada commit:** `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` (até os hooks da F1 existirem).

---

## Parte 1: decisões

### 1.1 Padrão arquitetural: monólito modular

Módulos por assunto do negócio no topo, com as camadas `domain → application → infrastructure → ui` dentro de cada módulo.

```
src/
    app/                    # só rotas do Next.js; finas, chamam os módulos
    modules/
        catalog/
            domain/
            application/
            infrastructure/
            ui/
            index.ts        # API pública: a única porta de entrada
            README.md
        taste/
        discovery/
        room/
        accounts/
        analytics/
    shared/
        ui/                 # design system: tokens e componentes sem regra de negócio
        config/             # configuração validada (zod)
        logger/
        events/             # barramento de eventos em processo
        lib/                # day, rate-limit, qr, pix
```

### 1.2 Módulos

| Módulo                | Responsável por                                                                                                 | Depende de               | Dono das tabelas de                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| `catalog`             | títulos, gêneros, streamings, elenco, sync TMDB, **busca** de títulos e pessoas                                 | nenhum módulo de negócio | títulos, gêneros, streamings, créditos, índice de busca |
| `taste`               | gosto de cada pessoa: sinais e grafo                                                                            | catalog                  | sinais de gosto, arestas do grafo                       |
| `discovery`           | o que mostrar agora: filtros, sorteio, "Me surpreenda", indicações do dia, **sentimentos**, conflitos de gênero | taste, catalog, accounts | indicações do dia                                       |
| `room`                | escolha em grupo                                                                                                | taste, catalog           | salas, participantes, votos                             |
| `accounts`            | login por código, sessão, baixar e apagar meus dados                                                            | nenhum módulo de negócio | contas, sessões, códigos                                |
| `analytics`           | eventos de uso anônimos                                                                                         | nenhum módulo de negócio | eventos de uso                                          |
| `library` _(pós-MVP)_ | Minha lista, avaliações, resenhas                                                                               | catalog, taste, accounts | listas, avaliações                                      |
| `shared`              | o que não é negócio                                                                                             | nada                     | limites de requisição                                   |

Gatilhos registrados (entram nos ADRs):

- a **busca** vira módulo `search` quando precisar retornar algo fora do catálogo (pessoas usuárias, listas, resenhas);
- o módulo **`support`** nasce se o Sobre ganhar dado ou regra (formulário, meta de apoio);
- o módulo **`social`** (perfil social, amigos, feed) será decidido no pós-MVP.

A página **Sobre** é só rota em `app/`; `qr` e `pix` vão para `shared/lib`.

### 1.3 Comunicação entre módulos

- **Padrão:** chamada direta à função exportada pelo `index.ts` do outro módulo.
- **Evento em processo** (sem fila nem serviço externo) quando A não pode depender de B, ou quando mais de um módulo precisa reagir ao mesmo fato.
- Eventos iniciais: `AccountDeleted` (taste, room, analytics e, no futuro, library apagam o que é seu). No pós-MVP: `TitleRated` (library → taste, analytics).
- Teste obrigatório: todo módulo dono de dado pessoal está inscrito em `AccountDeleted`.

### 1.4 Banco de dados

- Um schema Postgres só. Cada módulo tem seu arquivo de tabelas em `modules/<m>/infrastructure/db/schema.ts`; o `schema.ts` atual é dividido entre eles, **sem gerar migration nova** (`drizzle-kit generate` deve sair vazio).
- O repositório de um módulo só importa as tabelas do próprio módulo (garantido pelo `dependency-cruiser`).
- Chaves estrangeiras entre módulos: permitidas só para IDs estáveis de `catalog` (título) e `accounts` (conta).
- Consultas que cruzam módulos por desempenho (ex.: sorteio filtrado) são **modelos de leitura nomeados**, cada um com ADR curto.

### 1.5 Telas

- `app/`: só rotas, finas.
- `modules/<m>/ui/`: componentes do assunto (ex.: `FiltersPanel` em discovery, `RoomApp` em room).
- `shared/ui/`: design system (botões, chips de vidro, tipografia, `TmdbImage`, `GradientAscii`).
- Schemas zod de entrada ficam no módulo, ao lado do caso de uso; a server action só importa.
- Armazenamento no navegador: cada módulo tem seu adaptador de cliente (ex.: gosto do visitante em `taste`).
- Retorno padrão das actions: `{ ok: true, data } | { ok: false, error: <mensagem genérica> }`; detalhe técnico só no log do servidor.

### 1.6 Regras de fronteira (verificadas por ferramenta)

1. Entre módulos: importar só pelo `index.ts`.
2. Sentido das dependências conforme a tabela 1.2.
3. Sem ciclos.
4. Dentro do módulo: `domain` não importa `application`, `infrastructure`, `ui`, `next`, `react`; `application` não importa `infrastructure` nem `ui`.
5. Código de cliente (`"use client"`) não importa código de servidor (`server-only`, banco, segredos).
6. Repositório só acessa as tabelas do próprio módulo.
7. `shared` não importa nenhum módulo.

Ferramentas: **`dependency-cruiser`** (regras 1–4, 6, 7, e gera o diagrama) e **ESLint `no-restricted-imports`** (regra 5, aviso no editor).

### 1.7 Automação em três camadas

| Camada                                                                               | Quando                                | O que roda                                                                                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hook do Claude Code                                                                  | ao editar código / ao terminar tarefa | `arch:check`; revisão obrigatória de README/ADR/`DESIGN.md` dos módulos tocados                                                                     |
| Git hooks (`.githooks/`, ativados pelo script `prepare` no `npm install`, sem Husky) | `pre-commit`                          | formatação, lint, `arch:check` nos arquivos alterados, regeneração dos docs gerados                                                                 |
|                                                                                      | `pre-push`                            | typecheck e testes unitários                                                                                                                        |
| CI (GitHub Actions) + proteção de branch                                             | todo PR                               | tudo: format, lint, typecheck, test, build, bundle, security, Lighthouse, `arch:check`, capturas de tela, docs gerados atualizados, testes de banco |

### 1.8 Documentação viva

- **Gerada** (em `docs/generated/`, nunca editada à mão): diagrama de dependências, diagrama do banco por módulo, API pública de cada módulo, lista de eventos e inscritos. Regenerada no `pre-commit`; o CI falha se estiver desatualizada.
- **Escrita**: README de cada módulo (propósito, vocabulário com tabela inglês ↔ português, regras de negócio, links para user stories), ADRs, visão geral e guias.
- **Gatilhos:** o hook do Claude Code obriga revisar os docs dos módulos tocados; o CI falha se `index.ts`, tabelas ou eventos de um módulo mudarem sem mudança no README dele; o template de PR tem campo obrigatório "documentação atualizada".

Estrutura:

```
CLAUDE.md                       # regras curtas, apontando para os docs
DESIGN.md                       # fonte das regras de design (inglês)
DESIGN.pt-BR.md                 # tradução, estrutura verificada por teste
src/modules/<m>/README.md
docs/architecture/overview.md
docs/architecture/boundaries.md
docs/architecture/adr/
docs/guides/                    # new-module, new-migration, new-event, new-component
docs/generated/
docs/requisitos/                # já existe, em português
.claude/skills/kinne-standards/SKILL.md
```

### 1.9 Limpeza de slop

- Escopo: **código** (comentários narrativos, abstrações de uso único, código morto, checagens impossíveis, duplicação, nomes genéricos, testes que testam o mock) e **documentação** (duplicados, contraditórios, inflados). Textos da interface: só listar resquícios, decisão caso a caso.
- Método: auditoria que só lista (`ponytail-audit` como apoio, com a trava de segurança) → correção em PRs por módulo, no mesmo ciclo da migração.

### 1.10 Ajustes do MVP

**Conflitos de gênero** (em `discovery`). Título é excluído se tiver gênero conflitante; entre os restantes, os mais "puros" no gênero pedido vêm primeiro. Se o resultado ficar vazio, relaxa os conflitos e mantém só o desempate.

| Pediu             | Exclui se também tiver              |
| ----------------- | ----------------------------------- |
| Comédia           | Terror, Suspense (Thriller), Guerra |
| Romance           | Terror, Guerra                      |
| Família, Animação | Terror, Suspense, Crime             |
| Terror            | Família                             |
| Suspense          | Família                             |
| Drama             | —                                   |
| Ação              | —                                   |

**Classificação indicativa:** a linha "Classificação" troca o 18+ sim/não por um seletor _Livre · 12 · 14 · 16 · 18_ ("até qual idade"), usando a certificação brasileira do TMDB. **Idioma** fica para o pós-MVP.

**Streamings aprendidos pelo uso:** sem passo obrigatório.

- Sem streamings marcados, o sorteio usa os principais.
- Na linha "onde assistir" de um serviço ainda não respondido: "Disponível na **X** · Você assina? **Sim** · **Não**". Sim salva; Não remove e troca a indicação na hora; ignorar não faz nada.
- Resumo sempre visível perto dos botões: "Todos os streamings · escolher os meus" ou "Netflix, Max · alterar".
- Salvo onde os streamings já são salvos hoje (navegador para visitante, conta para logado). Nada na URL.

### 1.11 Design system

- **O código é a única fonte.** Sem Figma.
- `/lab`: rota interna (fora da produção) para testar ideias visuais isoladas.
- Aprovado no lab → vira **token** ou **componente** em `shared/ui`, nunca valor solto na tela.
- Lint bloqueia cor, espaçamento e raio fora dos tokens.
- **Capturas de tela** (Playwright) travam o visual aprovado de cada componente e tela.
- **`kinne.com.br/guidelines`**: página pública, no formato de brand book editorial, que renderiza os componentes reais e exibe o texto do `DESIGN.md`. Bilíngue (português por padrão, inglês por seletor salvo no navegador). Botão "Baixar DESIGN.md". Seções: Fundamentos, Marca, Cor, Tipografia, Vidro e textura, Componentes, Movimento, Voz ("Diga / Evite", exemplos sempre em português), Exportar.
- Regras já decididas que entram no `DESIGN.md`: fundo `#020202` sem glow; destaque `#FFF340` só no controle principal (um amarelo por tela, exceção consciente: personagem no elenco); wordmark amarela sem recolorir; Darker Grotesque 500 nos títulos e Manrope no texto; números tabulares; cantos retos em imagens e cartazes; vidro médio, cantos suaves, grão em botões e chips; chip selecionado preenchido, sem ícone; skeleton no carregamento.

### 1.12 Revisão e merge

- Todo PR recebe revisão de um **agente revisor** (GitHub App própria), que não escreveu o código, com base em `kinne-standards`, `DESIGN.md`, regras de segurança e `ponytail-review`. A revisão **bloqueia**; o Leonardo pode sobrepor.
- Classificação de risco **por caminhos alterados** (mecânica, não por julgamento do agente):

| Risco  | Caminhos                                                                                                                                                                                                                                                                            | Merge                                  |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Alto   | `modules/accounts/**`; segurança (CSP, headers, rate limit, `server-only`); `drizzle/**` e arquivos de schema; `shared/config/**`, `.env*`; `.github/workflows/**`; `package.json`, lockfile; `CLAUDE.md`, `.claude/**`, `.dependency-cruiser.*`, `.githooks/**`, `eslint.config.*` | só o Leonardo                          |
| Visual | qualquer PR que altere uma captura de tela aprovada                                                                                                                                                                                                                                 | só o Leonardo                          |
| Baixo  | docs, testes, refatoração sem mudança de comportamento, limpeza de slop fora das áreas acima                                                                                                                                                                                        | robô, se tudo verde e revisão aprovada |

- Merge automático **só em `develop`**, nunca em `main`. Cada merge automático gera resumo; qualquer um pode ser revertido.
- O robô só aprova e faz merge; não escreve commits.

### 1.13 Operação e escala

- Configuração única em `shared/config` (zod, falha no início); `.env.example` verificado por teste contra o schema.
- Logger mínimo só no servidor, sem dados pessoais (nunca e-mail, código de sala, cookie, token).
- "Orçamento do plano gratuito": medir horas do Neon, chamadas ao TMDB e invocações da Vercel; revisar índices das consultas quentes; job de limpeza de salas expiradas e eventos antigos.

### 1.14 ADRs a criar (em inglês)

1. `0001-modular-monolith.md`
2. `0002-module-boundaries-and-tooling.md`
3. `0003-inter-module-communication.md` (direto + eventos)
4. `0004-database-ownership.md` (inclui modelos de leitura)
5. `0005-ui-placement.md`
6. `0006-living-documentation.md`
7. `0007-documentation-language.md`
8. `0008-design-system-code-as-source.md`
9. `0009-review-and-auto-merge.md`
10. `0010-genre-conflicts.md`
11. `0011-progressive-streaming-profile.md`

---

## Parte 2: fases e prompts

Ordem: **F0 → Ajustes do MVP → F1 → F2 → F3 → F5 → pós-MVP.**

### F0: rede de segurança

**Objetivo:** travar o que existe antes de mudar qualquer coisa.

**Entregas:** capturas de tela de todas as telas (celular e computador, estados principais); `docs/baseline.md` com tempo de testes e build, tamanho de bundle e nota Lighthouse; remoção de `qrcode-8.2-py3-none-any.whl`; unificação de `docs/refinements.md` e `docs/refinos.md`; README corrigido (stack real, mantendo a atribuição do TMDB).

**Prompt:**

```
Leia CLAUDE.md, AGENTS.md, DESIGN.md, docs/security.md e docs/plano-fundacao.md
(seções "Regras que valem para todas as fases" e "F0"). Siga essas regras à risca,
especialmente: commits e PRs só em meu nome, sem nenhuma linha de autoria do Claude;
indentação de 4 espaços; nada removido que seja de segurança.

Tarefa: fase F0 (rede de segurança). Não altere comportamento do app.

1. Verifique se o projeto já tem Playwright. Se não tiver, me pergunte antes de
   instalar @playwright/test. Crie testes de captura de tela (toHaveScreenshot) de
   todas as rotas públicas em viewport de celular (390x844) e computador (1440x900),
   incluindo estados principais: início, escolher agora com filtros abertos, tela de
   título, sala de grupo (criar e entrar), Sobre, carregamento (skeleton) e erro.
   Desative animações nos testes para capturas estáveis. Gere as imagens de base.
   Adicione o script npm "test:visual".
2. Meça e registre em docs/baseline.md: tempo de "npm test", tempo de "npm run build",
   resultado de "bundle:check" e nota do Lighthouse das rotas principais.
3. Remova qrcode-8.2-py3-none-any.whl da raiz, confirmando antes que nada o usa;
   documente a dependência no cabeçalho de scripts/generate-pix-qr.py se fizer sentido.
4. Compare docs/refinements.md e docs/refinos.md, me mostre as diferenças e pergunte
   qual é a fonte antes de unificar.
5. Corrija o README.md para refletir a stack real (Next.js 16, Postgres no Neon,
   Drizzle, Resend, Vercel), os scripts disponíveis e o mapa de docs. Mantenha
   exatamente a frase de atribuição do TMDB.

Faça um PR por item (branches chore/visual-baseline, docs/baseline-metrics,
chore/remove-residue, docs/unify-refinements, docs/readme-stack), todos para develop.
Ao final, me diga os números da baseline e qualquer captura que pareça instável.
```

### Ajustes do MVP

**Objetivo:** corrigir o que os usuários notaram, com a rede da F0 armada. O código ainda não está nos módulos; tudo bem, será movido na F2.

**Prompt:**

```
Leia CLAUDE.md, DESIGN.md, docs/security.md e docs/plano-fundacao.md (regras gerais
e seção 1.10). Siga as regras gerais à risca (autoria só minha, 4 espaços, segurança).

Antes de cada mudança que mexa em entrada de dados, liste os possíveis vetores de
ataque (OWASP Top 10) e como o código os evita. Cada item abaixo deve ter user story
em docs/requisitos/ (português, formato "Eu, como…", critérios Dado/Quando/Então);
crie ou atualize antes de codar e me mostre.

1. Conflitos de gênero (branch feat/genre-conflicts): implemente a tabela da seção
   1.10 como função pura de domínio, com testes cobrindo cada linha, o desempate por
   pureza (menos gêneros extras = primeiro) e o relaxamento quando o resultado fica
   vazio. Caso de teste obrigatório: pedir Comédia não retorna Parasita (Comédia,
   Suspense, Drama).
2. Classificação indicativa (branch feat/age-rating): troque o 18+ sim/não da linha
   "Classificação" por um seletor Livre · 12 · 14 · 16 · 18 ("até qual idade"), com a
   certificação brasileira do TMDB. Verifique se o catálogo já guarda essa informação;
   se exigir migration ou nova sincronização, pare e me explique o impacto antes.
   Títulos sem certificação: me pergunte o comportamento.
3. Streamings aprendidos pelo uso (branch feat/progressive-streaming): implemente a
   seção 1.10. Sem passo obrigatório. Pergunta "Você assina?" de um toque na linha
   "onde assistir"; "Não" troca a indicação na hora; resumo sempre visível. Salve onde
   os streamings já são salvos hoje. Nada em URL, nada no console. O visual deve usar
   os componentes e tokens existentes; não invente valores. Me mostre capturas de tela
   antes de dar como pronto.

Atualize as capturas de tela da F0 só onde a mudança visual for intencional e liste
quais mudaram. Um PR por item, para develop.
```

### F1: ferramentas e regras

**Objetivo:** as regras passam a ser verificadas automaticamente antes da migração.

**Prompt:**

```
Leia CLAUDE.md, AGENTS.md e docs/plano-fundacao.md (regras gerais e seções 1.6, 1.7,
1.8, 1.12, 1.14). Siga as regras gerais à risca.

Tarefa: fase F1. Não mova código de produto nesta fase.

1. dependency-cruiser (aprovado): instale e configure .dependency-cruiser.cjs com as
   regras 1.6 já escritas para a estrutura futura src/modules/* e src/shared/*. Como o
   código ainda está em src/domain, src/application etc., inclua também as regras de
   camada atuais (domain não importa application/infrastructure/app/next/react;
   application não importa infrastructure/app). Script "arch:check" e script
   "arch:graph" que gera docs/generated/dependencies.svg. Demonstre no PR: um import
   proibido de propósito falhando, depois revertido.
2. ESLint: no-restricted-imports para que arquivos com "use client" não importem
   server-only, banco, auth ou TMDB. Adicione também: no-console (erro), eqeqeq,
   @typescript-eslint/consistent-type-imports.
3. Git hooks nativos (sem Husky): pasta .githooks/ com pre-commit (format, lint,
   arch:check nos arquivos alterados, regeneração de docs gerados) e pre-push
   (typecheck e testes unitários). Script "prepare" no package.json que roda
   "git config core.hooksPath .githooks". Garanta que funciona no Fedora (bash).
4. CI: workflow com jobs paralelos para format, lint, typecheck, test, build,
   bundle:check, arch:check, test:visual, verificação de docs gerados atualizados, e os
   jobs que já existem (security, lighthouse). Use o gh CLI para configurar proteção
   de branch em develop e main: PR obrigatório e todos esses checks obrigatórios.
   Me mostre o comando antes de executar.
5. Hooks do Claude Code em .claude/settings.json: rodar arch:check após edições de
   código; ao terminar a tarefa, listar módulos/pastas tocados e exigir a revisão dos
   READMEs, ADRs e do DESIGN.md (e DESIGN.pt-BR.md) correspondentes.
6. Documentação base: docs/architecture/overview.md, docs/architecture/boundaries.md e
   os 11 ADRs da seção 1.14, em inglês, curtos (Context, Decision, Alternatives,
   Consequences, Status), com o conteúdo das decisões deste plano.
7. Skill kinne-standards em .claude/skills/kinne-standards/SKILL.md: módulos,
   fronteiras, eventos, banco, padrão de actions, design system, o que é slop no Kinne,
   e a regra "segurança vence a régua de código mínimo". Atualize o CLAUDE.md para
   ficar curto e apontar para a skill, os ADRs e o DESIGN.md, incluindo a regra de
   autoria (commits e PRs só em meu nome, sem linhas do Claude) e 4 espaços.
8. Template de PR: acrescente "módulo(s) afetado(s)", "risco (alto/visual/baixo)" e
   "documentação atualizada" (obrigatório).
9. Robô revisor: prepare o workflow de revisão e de classificação de risco por
   caminhos (seção 1.12), com merge automático só em develop e só para risco baixo.
   A criação da GitHub App exige minha conta: escreva em docs/guides/review-bot.md o
   passo a passo exato do que eu preciso clicar, e deixe todo o resto pronto.

Um PR por item, para develop. Itens 1, 3, 4, 5 e 9 são risco alto: não faça merge.
```

**Ação sua (única):** criar a GitHub App seguindo `docs/guides/review-bot.md`.

### F2: migração para módulos

**Objetivo:** mover o código para `src/modules`, limpando o slop e documentando cada módulo no mesmo ciclo. Ordem: `shared` → `catalog` → `taste` → `discovery` → `room` → `accounts` → `analytics`.

**Prompt de auditoria (rodar uma vez, antes):**

```
Leia docs/plano-fundacao.md (regras gerais, 1.1 a 1.9) e a skill kinne-standards.

Tarefa: auditoria de slop, SEM alterar nenhum arquivo. Se a skill ponytail-audit
estiver disponível, use-a como apoio, mas aplique a trava: nada de segurança (zod,
server-only, CSP, headers, rate limit, sessão) é classificado como removível.

Gere docs/audit/slop-report.md, organizado pelo módulo de destino (tabela 1.2), com
cada achado: arquivo, linha, categoria (comentário narrativo, abstração de uso único,
código morto, checagem impossível, duplicação, nome genérico, teste que testa o mock,
doc duplicado/contraditório/inflado, texto de interface sem sentido) e motivo.
Inclua também, por módulo, o mapa de arquivos atuais → destino em src/modules/.
Textos de interface: só liste, não proponha reescrita.
Abra um PR docs/slop-audit para develop e me mostre o resumo.
```

**Prompt por módulo (repetir trocando `<MÓDULO>`):**

```
Leia docs/plano-fundacao.md (regras gerais, 1.1 a 1.9), a skill kinne-standards,
docs/audit/slop-report.md e os ADRs.

Tarefa: migrar o módulo <MÓDULO> para src/modules/<MÓDULO>/ (ou src/shared/ se for
shared), seguindo o mapa do relatório de auditoria.

1. Mova os arquivos com git mv (preserva histórico), sem mudar comportamento.
   Camadas: domain, application, infrastructure, ui. Crie index.ts expondo só a API
   pública. Atualize os imports de quem usava esses arquivos para o index.ts.
2. Tabelas: mova as definições do módulo do schema.ts atual para
   src/modules/<MÓDULO>/infrastructure/db/schema.ts. Rode drizzle-kit generate e
   confirme que NÃO gera migration nova. Se gerar, pare e me mostre.
3. Wiring: substitua createDb() espalhado por uma fábrica do próprio módulo
   (composição em um lugar só). Server actions passam a ser: parse zod (schema dentro
   do módulo) → caso de uso → resposta no formato padrão da seção 1.5.
4. Se o módulo guarda dado pessoal, inscreva-o em AccountDeleted (crie src/shared/events
   se ainda não existir) e garanta o teste de cobertura da seção 1.3.
5. Limpe o slop listado no relatório para este módulo. Nada de segurança.
6. Testes: mova testes de banco para junto do repositório do módulo; mantenha
   "test:db" funcionando. Asserts não mudam, só imports.
7. Escreva src/modules/<MÓDULO>/README.md em inglês: purpose, vocabulary (tabela
   inglês ↔ português), business rules, public API, events, owned tables, links para
   user stories. Regenere os docs gerados.
8. Ative no dependency-cruiser as regras de módulo para <MÓDULO> e confirme
   arch:check verde. Capturas de tela devem continuar idênticas.

PR refactor/module-<MÓDULO> para develop. Se o diff ficar grande demais para revisar,
divida em PRs menores (estrutura, depois limpeza).
```

Depois de `discovery`: criar o ADR do modelo de leitura do sorteio filtrado.
Depois do último módulo: remover as regras de camada antigas (`src/domain` etc.) do dependency-cruiser e confirmar que as pastas antigas estão vazias.

### F3: design system

**Prompt:**

```
Leia DESIGN.md, docs/plano-fundacao.md (regras gerais e seção 1.11) e a skill
kinne-standards. Siga as regras gerais à risca.

Tarefa: fase F3.

1. Tokens: em src/shared/ui/tokens, defina com nomes semânticos as cores, espaçamento,
   raios, níveis de vidro, grão, durações de animação e estilos tipográficos que o
   código já usa. Primeiro me mostre a lista de valores encontrados no código e as
   duplicatas quase iguais, para eu escolher quais ficam. Não mude o visual sem minha
   aprovação.
2. Componentes: consolide em src/shared/ui os componentes visuais genéricos (botão
   principal e secundário, chip, painel de vidro, moldura de imagem com cantos retos,
   ficha técnica, navbar, skeleton), usando só tokens. As telas passam a usá-los.
3. Lint de valores soltos: regra que falha com cor hex, rgb, espaçamento ou raio
   arbitrário fora de src/shared/ui/tokens (incluindo classes arbitrárias do Tailwind).
4. /lab: rota interna, desativada em produção, para testar variações de componentes.
5. DESIGN.md (inglês) reorganizado nas seções da 1.11, com todas as regras já
   decididas listadas lá, e DESIGN.pt-BR.md com a mesma estrutura. Teste que compara a
   estrutura dos dois. Seção Voice com pares Say/Avoid, exemplos sempre em português.
6. /guidelines: página pública no formato de brand book editorial (barra lateral com
   seções, coluna central estreita, peça real ao lado da regra), renderizando os
   componentes reais de shared/ui com todos os estados e exibindo o texto do
   DESIGN.md. Português por padrão, seletor de idioma salvo no navegador (nada na
   URL). Botão "Baixar DESIGN.md". Não exponha nada de servidor ou configuração.
   Siga o próprio design system; me mostre capturas de celular e computador antes de
   dar como pronto.

Capturas de tela das telas existentes devem continuar idênticas, exceto o que eu
aprovar. Um PR por item, para develop.
```

### F5: operação

**Prompt:**

```
Leia docs/plano-fundacao.md (regras gerais e seção 1.13). Siga as regras gerais.

1. src/shared/config: um único módulo de configuração validado com zod, com seções
   (db, tmdb, auth, email, search, sync), falhando no início com mensagem legível.
   Substitua todas as leituras soltas de process.env. Teste que compara as chaves com
   .env.example. Nenhum segredo em NEXT_PUBLIC_*.
2. src/shared/logger: logger mínimo só no servidor, com nível e contexto, que nunca
   registra e-mail, código de sala, cookie ou token (com teste). Erros das actions
   registram o detalhe aqui e devolvem mensagem genérica.
3. docs/operations/free-tier-budget.md: meça onde o Kinne estoura primeiro no plano
   gratuito (horas de computação do Neon, chamadas ao TMDB, invocações e cache da
   Vercel). Rode EXPLAIN nas consultas mais usadas (sorteio filtrado, busca, grafo de
   gosto) e proponha índices; implemente os que forem claramente vantajosos, com antes
   e depois. Se exigir migration, me mostre antes.
4. Job de limpeza (GitHub Actions) de salas expiradas e eventos de uso antigos, idempotente,
   com o prazo de retenção perguntado a mim antes.
5. docs/operations/runbook.md: deploy, rollback, sync de catálogo, o que fazer se um
   job falhar.

Um PR por item, para develop.
```

### Pós-MVP

Começa depois da F5, sobre a base pronta, com uma nova entrevista de produto. Primeiro item: **liberar as contas e criar o módulo `library` com a Minha lista** (pedido de 12 das 15 pessoas no feedback), seguido de sentimentos, avaliações e idioma nos filtros.

---

## Definição de pronto da fundação

- [ ] Capturas de tela travam o visual; baseline registrada.
- [ ] Conflitos de gênero, classificação indicativa e streamings pelo uso no ar.
- [ ] Violação de fronteira falha no hook do Claude Code, no commit e no CI.
- [ ] Todo o código em `src/modules` e `src/shared`; pastas antigas removidas.
- [ ] Cada módulo com `index.ts` público, README e tabelas próprias; `drizzle-kit generate` vazio.
- [ ] `AccountDeleted` cobre todo módulo com dado pessoal (com teste).
- [ ] Docs gerados sempre atualizados; ADRs 0001–0011 escritos.
- [ ] Slop do relatório resolvido.
- [ ] Tokens, `shared/ui`, lint de valores soltos, `/lab` e `/guidelines` bilíngue.
- [ ] Configuração única, logger, orçamento do plano gratuito, job de limpeza, runbook.
- [ ] Robô revisor ativo, com merge automático só para risco baixo em `develop`.
