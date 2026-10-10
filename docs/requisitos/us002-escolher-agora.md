# US002 – Escolher agora

Kinne · Requisitos da semana 0 · versão de 09/10/2026

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

| Campo            | Tipo             | Obg | Validações                                                                               | Exemplo    | Valor padrão           |
| ---------------- | ---------------- | --- | ---------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| Streamings       | Seleção múltipla | Não | Streamings participantes (RNG002)                                                        | "Netflix"  | Os salvos no navegador |
| Tipo             | Seleção simples  | Sim | "Filmes", "Séries", "Os dois"                                                            | "Filmes"   | "Os dois"              |
| Gênero           | Seleção múltipla | Não | "Ação", "Comédia", "Drama", "Romance", "Suspense"; Romance só com Filmes ou Os dois (C8) | "Drama"    | Nenhum                 |
| Nota TMDB mínima | Slider           | Sim | 6,0 a 9,0, passo 0,1                                                                     | "7,2"      | "6,4"                  |
| Duração          | Slider           | Sim | "Até 1h30", "Até 1h45", "Até 2h", "Qualquer"; só com Filmes (C2)                         | "Até 1h45" | "Qualquer"             |

**E** exibe o contador "N títulos combinam" e a ação "Ver recomendação" (principal)  
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

### C6: Ver a recomendação

**Dado** que pelo menos um título combina  
**Quando** aciono "Ver recomendação"  
**Então** o sistema abre a tela do título com um título sorteado pela RNE003, com origem "filtros" (US004)

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

## Regras de negócio específicas

- **RNE001 – Seleção múltipla.** Vários streamings ou gêneros marcados significam "qualquer um dos marcados"; nenhum marcado vale como todos (RNG003).
- **RNE002 – Nota mínima.** O valor do slider substitui o 6,4 do piso; os demais itens do piso continuam valendo.
- **RNE003 – Sorteio.** Os títulos que combinam são ordenados pela nota, e o sorteio é entre os 10 maiores. "Outra opção" sorteia outro dos mesmos 10, sem repetir (US004). A contagem de 09/10/2026 confirmou o número: o menor grupo tem 137 títulos.
- **RNE004 – Duração.** Cada posição do slider significa "até" aquele tempo; "Qualquer" não limita.
