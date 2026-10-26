# 00 – Visão geral e regras gerais

Kinne · Requisitos da semana 0 · versão de 12/10/2026

## Objetivo

Este conjunto especifica o modo visitante do Kinne: indicação do dia, Escolher agora e Me surpreenda, sem login, para filmes e séries em streaming por assinatura no Brasil. A construção vai até cerca de 25/10/2026, e o teste com pelo menos 15 pessoas ocorre de 26/10 a 01/11/2026.

## Siglas

| Sigla | Significado                                          |
| ----- | ---------------------------------------------------- |
| US    | História de usuário                                  |
| C     | Cenário de critério de aceitação                     |
| RNG   | Regra de negócio geral, válida para várias histórias |
| RNE   | Regra de negócio específica de uma história          |
| CM    | Comportamento comum a várias telas                   |
| RNF   | Requisito não funcional                              |
| ME    | Definição de medição do teste                        |

## Escopo

### Entra na semana 0

- Tela inicial com as cinco indicações do dia
- Filtros de Escolher agora
- Me surpreenda
- Tela do título, com endereço próprio e trailer
- Estados de carregamento, erro, nenhum título, fim das opções e confirmação
- Eventos de uso sem identificação e exclusão da equipe da contagem
- Atualização diária do catálogo

### Fica para depois

- Perfil, login por magic link e onboarding
- Regra de recomendação com perfil
- Marcar um título como "Não me interessa"
- Filtro de ano (o dado já existe no banco)
- Filtro de temporadas para séries
- Desfazer uma marcação
- Texto de privacidade completo (LGPD)
- Aluguel e compra, inteligência artificial e app para iOS

## Regras de negócio gerais

- **RNG001 – Catálogo em duas camadas.** O catálogo guarda todos os títulos por assinatura nos streamings participantes (RNG002), não só os que passam no piso. Uma segunda camada, `is_recommendable`, marca o que as recomendações podem usar: sinopse em português, imagem larga, pelo menos 50 votos, classificação indicativa conhecida, ativo e não bloqueado. Sobre ela vale o piso de qualidade dos filtros e da surpresa: nota TMDB de 6,4 ou mais e pelo menos 500 votos. A busca de títulos alcança o catálogo inteiro; indicações do dia, filtros e surpresa, só os recomendáveis. Substitui o piso único de 09/10/2026 (2.190 filmes e 710 séries); em 12/10/2026, no banco develop, eram 21.968 títulos, 8.599 recomendáveis.
- **RNG002 – Streamings participantes.** Netflix, Max, Prime Video, Disney+ e Globoplay, apenas por assinatura e apenas no Brasil.
- **RNG003 – Nenhum marcado vale como todos.** Em qualquer seleção múltipla, nenhuma opção marcada equivale a todas marcadas.
- **RNG004 – Títulos marcados.** Títulos marcados como "Já vi" saem de todas as recomendações daquele navegador, exceto da indicação do dia. A marcação é permanente no navegador.
- **RNG005 – Memória do navegador.** Streamings marcados, títulos marcados e o código do navegador ficam no localStorage, entre visitas. Os demais filtros ficam no sessionStorage e voltam ao padrão quando a aba é fechada.
- **RNG006 – Horário.** Toda data e todo "dia" do sistema seguem o horário de Brasília.
- **RNG007 – Gêneros no TMDB.** Ação = Ação (filme) e Action & Adventure (série); Comédia = Comédia; Drama = Drama; Romance = Romance, só para filmes, porque o TMDB não tem Romance para séries; Suspense = Thriller (filme) e Mistério (série).
- **RNG008 – Classificação 18.** Títulos com classificação indicativa 18 nunca entram na indicação do dia nem no Me surpreenda. Nos filtros, só aparecem com o chip "18+" marcado (US002 C10), que vem desmarcado. Título sem classificação conta como 18.

## Comportamentos comuns

### CM001 – Carregando

**Dado** que uma tela depende de dados que ainda não chegaram  
**Então** o sistema exibe um skeleton loader, com blocos no formato de cada peça da tela  
**E** os blocos de imagem têm cantos retos e os de botão, forma de pílula  
**E** os blocos pulsam lentamente em claridade, sem ícone girando e sem texto  
**E** o pulso fica parado quando o sistema pede movimento reduzido

### CM002 – Erro

**Dado** que uma tela não conseguiu obter os dados  
**Então** o sistema exibe "Não conseguimos carregar agora"  
**E** exibe a ação "Tentar de novo" (principal)  
**Quando** aciono "Tentar de novo"  
**Então** o sistema repete a última ação

### CM003 – Identidade visual

**Dado** qualquer tela do sistema  
**Então** a cor de destaque #FFDF25 aparece só no controle mais importante da tela e no ícone da marca  
**E** imagens de filmes e séries têm cantos retos  
**E** todo controle tocável tem forma de pílula, com cantos totalmente arredondados; botões só de ícone são círculos; o que não se toca nunca é pílula  
**E** o fundo é #020202, os títulos usam Darker Grotesque 500 e a interface usa Manrope

### CM004 – Movimento reduzido

**Dado** que o sistema operacional pede movimento reduzido  
**Então** o sistema não executa rotações automáticas nem animações de troca

## Glossário

| Termo            | Significado                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Visitante        | Pessoa que usa o Kinne sem login                                                                |
| Indicação do dia | Os cinco títulos da tela inicial, um por gênero, iguais para todos no dia                       |
| Piso             | Condições mínimas para um título recomendável entrar nos filtros e na surpresa (RNG001)         |
| Título           | Um filme ou uma série                                                                           |
| Tagline          | Frase curta de divulgação do título, vinda do TMDB; na tela do título, aparece como chamada     |
| Origem           | Caminho pelo qual a pessoa chegou à tela do título: indicação do dia, filtros, surpresa ou link |
| Sessão           | Período em que a aba do Kinne fica aberta, mesmo com recarregamentos                            |
| Visita           | Sequência de eventos de um navegador, encerrada após 30 minutos sem eventos (ME01)              |
| Marcado          | Título que o navegador registrou como "Já vi"                                                   |
| Pílula           | Forma de todo controle tocável: retângulo com as pontas totalmente arredondadas (CM003)         |
| Wordmark         | Logotipo do Kinne em forma de palavra                                                           |
