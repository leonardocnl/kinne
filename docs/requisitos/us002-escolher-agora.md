# US002 – Escolher agora

Kinne · Requisitos da semana 0 · versão de 12/10/2026

|                |                                                                     |
| -------------- | ------------------------------------------------------------------- |
| **Tela**       | Filtros                                                             |
| **Eventos**    | recommendation_shown (origem filtered)                              |
| **Depende de** | RNG001, RNG002, RNG003, RNG004, RNG005, RNG007, CM001, CM002, CM003 |
| **Leva a**     | US004 (Ver um título)                                               |

## Descrição

Eu, como visitante, quero filtrar por streaming, tipo, gênero, nota e duração, para que eu receba um título que caiba no que quero ver agora.

## Critérios de aceitação

### C1: Abrir os filtros

**Dado** que estou na tela inicial  
**Quando** aciono "Escolher agora"  
**Então** o sistema abre os filtros com o título "O que você quer ver hoje?", contendo os seguintes campos:

| Campo            | Tipo             | Obg | Validações                                                                               | Exemplo     | Valor padrão           |
| ---------------- | ---------------- | --- | ---------------------------------------------------------------------------------------- | ----------- | ---------------------- |
| Streamings       | Seleção múltipla | Não | Streamings participantes (RNG002)                                                        | "Netflix"   | Os salvos no navegador |
| Tipo             | Seleção simples  | Sim | "Filmes", "Séries", "Os dois"                                                            | "Filmes"    | "Os dois"              |
| Gênero           | Seleção múltipla | Não | "Ação", "Comédia", "Drama", "Romance", "Suspense"; Romance só com Filmes ou Os dois (C8) | "Drama"     | Nenhum                 |
| Nota TMDB mínima | Slider           | Sim | 6,0 a 9,0, passo 0,1                                                                     | "7,2"       | "6,4"                  |
| Duração          | Slider           | Sim | "Até 1h30", "Até 1h45", "Até 2h", "Qualquer"; só com Filmes (C2)                         | "Até 1h45"  | "Qualquer"             |
| Classificação    | Chip "18+"       | Não | Marcado inclui títulos de classificação 18 (C10, RNG008)                                 | "18+"       | Desmarcado             |
| Ator ou diretor  | Busca            | Não | Pessoas do catálogo; uma por vez; 3 letras ou mais (C9)                                  | "Tom Hanks" | Nenhuma                |

**E** exibe o contador "N títulos combinam" e a ação "Sortear um título" (principal)  
**E**, no computador, os filtros abrem como painel de vidro sobre a capa, no canto superior direito  
**E**, em janela baixa, o painel desce sobre o título, que fica esmaecido  
**E**, no celular, os filtros abrem em tela cheia

### C2: Mostrar a duração só para filmes

**Dado** que os filtros estão abertos  
**Quando** marco "Filmes" no campo Tipo  
**Então** o sistema exibe o campo Duração  
**Quando** marco "Séries" ou "Os dois"  
**Então** o sistema esconde o campo Duração e desconsidera seu valor

### C3: Atualizar o contador

**Dado** que os filtros estão abertos  
**Quando** altero qualquer campo  
**Então** o contador mostra quantos títulos passam no piso e nos filtros, sem os títulos marcados (RNG004)

### C4: Nenhum título combina

**Dado** que os filtros estão abertos  
**Quando** nenhum título passa no piso e nos filtros  
**Então** o contador mostra "0 títulos combinam"  
**E** "Ver recomendação" fica desativado  
**E** o sistema exibe "Tente baixar a nota ou marcar mais um streaming."

### C5: Fechar os filtros

**Dado** que os filtros estão abertos  
**Quando** aciono o botão de fechar, pressiono Esc ou uso o "voltar" do celular  
**Então** o sistema fecha os filtros sem sair da página  
**E** mantém os valores escolhidos durante a sessão (RNG005)

### C6: Sortear um título

**Dado** que pelo menos um título combina  
**Quando** aciono "Sortear um título"  
**Então** o sistema abre a tela do título com um título sorteado na primeira rodada de 10 (RNE003), com origem "filtros" (US004)

### C7: Guardar os streamings

**Dado** que marquei ou desmarquei streamings  
**Quando** volto ao Kinne em outra visita, no mesmo navegador  
**Então** os filtros abrem com os mesmos streamings marcados  
**E** os demais campos voltam ao valor padrão

### C8: Romance só para filmes

**Dado** que os filtros estão abertos  
**Quando** marco "Séries" no campo Tipo  
**Então** o sistema esconde o gênero "Romance" e o desmarca, se estava marcado  
**Quando** marco "Os dois" com "Romance" marcado  
**Então** o contador e o sorteio consideram só filmes de Romance (RNG007)

### C9: Buscar ator ou diretor

**Dado** que os filtros estão abertos  
**Quando** digito pelo menos 3 letras em "Buscar ator ou diretor"  
**Então** o sistema sugere até 6 pessoas do catálogo, com nome, papel ("Atuação" ou "Direção") e em quantos títulos recomendáveis aparecem, sem consultar o TMDB  
**Quando** escolho uma pessoa  
**Então** o campo vira uma pílula com "Remover"  
**E** o contador e o sorteio consideram só os títulos dela, junto com os outros filtros  
**Quando** aciono "Remover"  
**Então** o campo volta e os filtros deixam de considerar a pessoa

### C10: Títulos 18+

**Dado** que os filtros estão abertos  
**Quando** marco o chip "18+"  
**Então** o contador e o sorteio passam a incluir títulos de classificação 18 (RNG008)  
**E**, com o chip desmarcado, esses títulos nunca aparecem

## Regras de negócio específicas

- **RNE001 – Seleção múltipla.** Vários streamings ou gêneros marcados significam "qualquer um dos marcados"; nenhum marcado vale como todos (RNG003).
- **RNE002 – Nota mínima.** O valor do slider substitui o 6,4 do piso; os demais itens do piso continuam valendo.
- **RNE003 – Rodadas.** Os títulos que combinam são ordenados pela nota ponderada, no estilo do IMDb: WR = v/(v+m) · R + m/(v+m) · C, com R a nota, v os votos, C a média das notas dos candidatos e m = 500 (o mínimo de votos do piso). Empate vai para mais votos e depois para o menor id. O sorteio é dentro de uma rodada de 10; "Outra opção" sorteia outro da mesma rodada, sem repetir (US004 C2), e ao fim da rodada a pessoa passa à seguinte (US004 C3). Com gênero marcado, as rodadas são os 10 melhores, os 10 seguintes e assim por diante.
- **RNE004 – Duração.** Cada posição do slider significa "até" aquele tempo; "Qualquer" não limita.
- **RNE005 – Rodadas sem gênero.** Sem gênero marcado, cada rodada de 10 leva os 2 melhores de cada um dos cinco gêneros; com Séries, sem Romance, a divisão é 3/3/2/2 (Ação, Comédia, Drama, Suspense). O que um gênero não preenche vem dos melhores que sobraram, para só a última rodada ser menor. Um título com dois gêneros entra uma vez só.
