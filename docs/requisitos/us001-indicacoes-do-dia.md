# US001 – Ver as indicações do dia

Kinne · Requisitos da semana 0 · versão de 12/10/2026

|                |                                                                      |
| -------------- | -------------------------------------------------------------------- |
| **Tela**       | Inicial                                                              |
| **Eventos**    | app_opened                                                           |
| **Depende de** | RNG001, RNG004, RNG006, RNG007, CM001, CM002, CM003, CM004           |
| **Leva a**     | US002 (Escolher agora), US003 (Me surpreenda), US004 (Ver um título) |

## Descrição

Eu, como visitante, quero ver ao abrir o app cinco indicações do dia, uma por gênero, para que eu tenha uma sugestão pronta sem precisar escolher nada.

## Critérios de aceitação

### C1: Exibir a tela inicial

**Dado** que acesso o endereço do Kinne  
**Quando** a tela inicial termina de carregar  
**Então** o sistema exibe a barra do topo com a data do dia e o botão "Entrar"  
**E** exibe o quadro com a capa da primeira indicação, o contador "1 de 5", o botão de pausar e a barra de progresso  
**E** exibe, abaixo do quadro, os seguintes campos da indicação em destaque:

| Campo         | Tipo   | Descrição                     | Exemplo                                     |
| ------------- | ------ | ----------------------------- | ------------------------------------------- |
| Título        | Texto  | Nome em português             | "Corra!"                                    |
| Frase         | Texto  | Tagline (RNE003)              | "Um fim de semana que esconde algo errado." |
| Gênero        | Texto  | Gênero da indicação           | "Suspense"                                  |
| Ano           | Número | Lançamento ou estreia         | "2017"                                      |
| Duração       | Texto  | Total; por episódio em séries | "1h 44min"                                  |
| Disponível em | Texto  | Streaming do título           | "Disponível no Prime Video"                 |

**E** exibe o link "Ver este título →"  
**E** exibe as ações "Escolher agora" (principal) e "Me surpreenda", lado a lado  
**E** exibe a faixa "Hoje" com as cinco indicações em miniatura, cada uma com gênero e título  
**E** exibe o rodapé com os créditos do TMDB e da JustWatch e o aviso "O Kinne conta visitas sem identificar quem você é"

### C2: Trocar as capas automaticamente

**Dado** que estou na tela inicial e ainda não toquei em nada  
**Quando** o tempo de exibição da capa atual termina (RNE002)  
**Então** o sistema mostra a próxima indicação  
**E** o título antigo sobe e sai, a imagem dissolve e o título novo sobe e entra  
**E** a barra de progresso recomeça

### C3: Parar a rotação no primeiro toque

**Dado** que as capas estão trocando automaticamente  
**Quando** toco, clico ou pressiono qualquer tecla na tela  
**Então** o sistema para a rotação e mantém a capa atual

### C4: Pausar e retomar pelo botão

**Dado** que estou na tela inicial  
**Quando** aciono o botão de pausar ao lado do contador  
**Então** o sistema pausa a rotação e o botão passa a indicar "retomar"  
**Quando** aciono o botão novamente  
**Então** o sistema retoma a rotação

### C5: Escolher uma indicação na faixa

**Dado** que estou na tela inicial  
**Quando** toco numa miniatura da faixa "Hoje"  
**Então** o sistema troca a capa para aquela indicação e para a rotação

### C6: Abrir a indicação em destaque

**Dado** que estou na tela inicial  
**Quando** aciono "Ver este título"  
**Então** o sistema abre a tela do título daquela indicação, com origem "indicação do dia" (US004)

### C7: Exibir no celular

**Dado** que a tela tem até 860px de largura  
**Então** o quadro ocupa a largura toda, em 16:9  
**E** a data aparece acima do título, e não na barra do topo  
**E** a faixa "Hoje" rola na horizontal

## Regras de negócio específicas

- **RNE001 – Sorteio do dia.** Cinco títulos, um por gênero (Comédia, Drama, Ação, Romance, Suspense), sorteados entre os que passam no piso (RNG001), com a data como semente. A indicação de Romance é sempre um filme (RNG007). São iguais para todos e não mudam ao recarregar, inclusive para quem marcou o título (RNG004). Um título não volta por 60 dias (ponto de partida).
- **RNE002 – Tempo de cada capa.** 3 segundos mais 1 segundo a cada 3 palavras da frase, com mínimo de 5 e máximo de 10 segundos.
- **RNE003 – Frase.** Sem tagline, o sistema usa a primeira frase da sinopse. Na contagem de 09/10/2026, de 40% a 100% dos títulos tinham tagline em português, conforme o grupo, e 100% tinham sinopse.
- **RNE004 – Imagem.** Proporção 2,39:1 no computador e 16:9 no celular, corte mirando 25% da altura, com grão.
- **RNE005 – Cópia diária.** A tela é servida de uma cópia gerada uma vez por dia, sem consultar o banco a cada visita (RNF07).
- **RNE006 – Sem 18.** Títulos de classificação 18 nunca são indicação do dia (RNG008).
