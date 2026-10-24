# 04 – Mudanças e pendências

Kinne · Requisitos da semana 0 · versão de 12/10/2026

## Pendências

### Sincronizar com o Drive

- [ ] Levar ao Google Drive as mudanças de 12/10/2026 abaixo (fases 1 a 4 do backlog do MVP): esta cópia foi atualizada antes da fonte da verdade.

### Aguardando aprovação (12/10/2026)

- [ ] m = 500 na nota ponderada (US002 RNE003) e a ordem 3/3/2/2 das séries sem gênero (RNE005).
- [ ] Riscos aceitos propostos nos PRs #21 a #24 (Lighthouse por npx; 18+ sem verificação de idade; leitura lenta de filmografias pela busca de pessoas; até 20 diretores por título).

### Decisões de produto

- [x] Definir o que o botão "Entrar" faz: abre o login por código no e-mail (US012, 23/10/2026).
- [ ] Definir o tratamento de um título que deixa de passar no piso ou sai de todos os streamings (US007, RNE003).
- [ ] Definir o prazo definitivo de retenção de eventos no texto de privacidade completo (LGPD).

### Grafo de gosto (23/10/2026)

- [x] Aprovar US008 a US011 e os modelos de ameaças `feelings-and-taste-ui.md` e `group-room.md` (aprovados em 23/10/2026).
- [x] Botão "Não me interessa": não entra nesta versão. O gosto usa só curti, não curti e vou assistir (decisão de 23/10/2026).
- [x] Sala de grupo: "o que cada um topa" é só streamings e gêneros (US011 C5), sem veto de título, e as pessoas aparecem sem nome ("Pessoa 1") (decisão de 23/10/2026).
- [x] Sala de grupo: os streamings valem em união, basta um membro ter (decisão de 23/10/2026).
- [x] Sala de grupo: se quem criou sair, o papel passa para a pessoa mais antiga na sala; se era a única, a sala encerra (US011 C11, decisão de 23/10/2026).
- [ ] Levar US008 a US011 ao Drive.

### Design

- [ ] Revisar a responsividade das demais telas no celular; a tela do título já foi revisada em 10/10/2026.
- [ ] Criar ilustrações para o quadro da imagem nos estados de erro e de fim das opções, hoje vazio.
- [ ] Testar no Safari do iPhone a barra de botões presa à base, o corte da sinopse em 4 linhas e o foco atrás da barra (US004, C9 e C11).
- [ ] Polimento da página /design: fonte de código do sistema (ui-monospace) como token de documentação, títulos de seção em text-title e espaço fixo entre a capa e a seção 01.

### Verificações no TMDB

- [x] Contar os títulos que passam no piso por gênero (referencia/contagem-do-catalogo.md): 500 votos e 10 melhores ficam.
- [ ] Ajustar os 60 dias de intervalo da indicação do dia e o 7,5 do Me surpreenda.
- [x] Conferir se Romance e Suspense existem como gêneros de série. Não existem; decisão na RNG007.
- [x] Conferir se as taglines vêm em português do Brasil. Vêm, mas faltam em parte das séries; regra na US004, RNE004.
- [ ] Conferir onde assistir no Brasil numa amostra de cerca de 20 títulos.
- [ ] Conferir se há link direto do título em cada streaming.
- [x] Conferir quantos títulos têm trailer, e quantos em português; regra na US004, RNE005.
- [ ] Conferir a frase de não endosso exigida pelos termos de uso do TMDB.

## Mudanças em relação ao resumo de passagem (09 e 10/10/2026)

| Ponto                   | Antes                                                              | Agora                                                                     |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Cor de destaque         | #DFFF4F                                                            | #FFF340                                                                   |
| Barra do topo           | Nome em Darker Grotesque                                           | Wordmark SVG original                                                     |
| Filtros                 | Streamings, gênero, nota, duração, ano                             | Streamings, tipo, gênero, nota, duração para filmes                       |
| Índice release_year     | Existe                                                             | Saiu                                                                      |
| Título na tela inicial  | Até 153px                                                          | ~72px computador, ~44px celular                                           |
| Ver este título         | Botão de vidro                                                     | Link com seta                                                             |
| Tela inicial no celular | Data na barra, quadro com margem                                   | Data acima do título, quadro de borda a borda                             |
| Rotação de capas        | Sem controle visível                                               | Botão de pausar                                                           |
| Tela do título          | Sem trailer                                                        | Botão "▶ Trailer"                                                         |
| Ações da tela do título | "Vou assistir", "Outra opção" e links "Já vi" e "Não me interessa" | "Vou assistir", "Já vi" e botão de dado, na mesma linha                   |
| Texto da tela do título | Frase curta                                                        | Chamada (tagline) e sinopse completa; no celular, 4 linhas com "Ler mais" |
| Nota na tela do título  | Na linha de dados                                                  | Grande, sobre a imagem, no canto oposto ao trailer                        |
| Botões no celular       | Abaixo do texto                                                    | Presos à base da tela                                                     |
| Não me interessa        | Na semana 0                                                        | Fica para depois                                                          |
| Forma dos controles     | Raios variados                                                     | Tudo em pílula; botões só de ícone são círculos                           |
| Gêneros de série        | Os cinco para filmes e séries                                      | Romance só para filmes; Suspense de série = Mistério (RNG007)             |
| Eventos                 | Cinco tipos                                                        | Seis tipos e recommendation_source                                        |
| Hospedagem              | Vercel                                                             | Vercel, com código portável (RNF11)                                       |
| Aviso do rodapé         | "Conta visitas de forma anônima"                                   | "Conta visitas sem identificar quem você é"                               |

## Mudanças de 12/10/2026 (fases 1 a 4 do backlog do MVP)

| Ponto                                 | Antes                           | Agora                                                                                                           |
| ------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Catálogo                              | Só o que passa no piso (RNG001) | Catálogo inteiro mais a camada `is_recommendable`; o piso vale nos filtros e na surpresa                        |
| Classificação 18                      | Sem regra                       | Nunca na indicação do dia nem na surpresa; nos filtros, só com o chip "18+" (RNG008)                            |
| Ordem nos filtros                     | Nota TMDB                       | Nota ponderada no estilo do IMDb, m = 500 (US002 RNE003)                                                        |
| Sorteio nos filtros                   | Entre os 10 de maior nota       | Rodadas de 10; sem gênero, 2 de cada gênero (3/3/2/2 em séries) (US002 RNE003, RNE005)                          |
| Ação dos filtros                      | "Ver recomendação"              | "Sortear um título"                                                                                             |
| Fim das opções                        | "Ver de novo" os mesmos 10      | "Sortear entre os próximos 10" / "os últimos N"; no fim, "Você viu todos os N títulos" e "Recomeçar" (US004 C3) |
| Busca de pessoas                      | Não existia                     | "Buscar ator ou diretor" nos filtros (US002 C9)                                                                 |
| Tela do título                        | Sem créditos                    | "Direção de X" e "Com A, B e C" (US004 C1)                                                                      |
| Botões da tela do título (computador) | No canto inferior direito       | Alinhados à primeira linha do título (US004 C10)                                                                |
| Imagens                               | w780 e w1280, sizes 100vw       | w780, w1280 e original com a largura real; sizes do quadro; preconnect ao image.tmdb.org                        |

## Mudanças de 23/10/2026 (grafo de gosto)

| Ponto                              | Antes                                     | Agora                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Piso para quem tem sinais de gosto | Nota ≥ 6,4 e ≥ 500 votos em tudo (RNG001) | Nos títulos que o gosto alcança, sem nota mínima e com ≥ 100 votos; o Me surpreenda e o visitante sem sinais seguem com o piso (`docs/design/taste-graph.md` §8) |
| Recomendação do TMDB no grafo      | Não existia                               | Vale 23% da proximidade, inteira só com obra em comum ≥ 0,30; abaixo disso, em proporção (§4.2)                                                                  |

## Mudanças de 23/10/2026 (contas)

| Ponto           | Antes                           | Agora                                                                                         |
| --------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| Login           | Magic link (MVP)                | Código de 6 dígitos no e-mail: nada secreto na URL e nada que um leitor de link gaste (US012) |
| Envio de e-mail | Não definido                    | Resend, com envio de desenvolvimento até o domínio existir (US012 RNE006)                     |
| Onboarding      | Três passos com progresso salvo | Igual, pulável e já preenchido com o que o navegador tinha (US013)                            |
| Sentimentos     | Para todos                      | Só com conta, com convite para o visitante (US015 C3)                                         |

### Pendências das contas

- [ ] Comprar o domínio kinne.com.br e configurar o Resend (registros SPF, DKIM e DMARC no DNS).
- [ ] Revisar o rascunho do texto de privacidade antes de as contas irem ao ar (US014 RNE003).
- [ ] Decidir se volta o botão "Não me interessa" (previsto no MVP, fora da etapa 2).
- [ ] Definir `AUTH_SECRET`, `RESEND_API_KEY` e `AUTH_EMAIL_FROM` na Vercel; sem eles ninguém entra.
- [x] Ligar a sala de grupo à conta (US015 C2): com sessão, a sala usa o gosto, o "Já vi" e os streamings da conta, lidos no servidor (24/10/2026).

## Mudanças de 24/10/2026 (congelamento de deploys)

| Ponto            | Antes                                                                             | Agora                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Deploys no teste | Congelamento de 26/10 a 01/11/2026: sem deploy, sem migration, sem mudança de env | Sem congelamento (decisão do dono: não há mais teste a proteger); o checklist de lançamento não o cita mais |

As datas do teste em `00-visao-geral.md`, `02-requisitos-nao-funcionais.md` e `03-medicao-da-semana-0.md` descrevem a janela de medição e o prazo de compatibilidade, não um congelamento, e ficam como estão até o dono decidir o que fazer com o teste.
