# US010 – Curtiu?

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| **Tela**       | Título (depois de "Já vi", US005 C2)                        |
| **Eventos**    | Nenhum novo (os sinais não vão para os eventos; ameaças B1) |
| **Depende de** | US005, US009, RNG004, RNG005, CM003                         |
| **Ameaças**    | `docs/threats/feelings-and-taste-ui.md`                     |

## Descrição

Eu, como visitante, quero dizer se gostei de um título que já vi, para que o Kinne entenda melhor o meu gosto.

## Critérios de aceitação

### C1: Perguntar depois de "Já vi"

**Dado** que acionei "Já vi" (US005 C2)  
**Quando** o título é marcado  
**Então**, junto do que US005 C2 já mostra, o sistema pergunta "Curtiu?" com dois botões discretos, 👍 e 👎, com nome acessível "Curti" e "Não curti"

### C2: Responder

**Dado** que a pergunta "Curtiu?" está na tela  
**Quando** aciono 👍 ou 👎  
**Então** o sistema guarda o sinal (US009 RNE001)  
**E** troca a pergunta por "Anotado.", sem outra ação

### C3: Não responder

**Dado** que a pergunta "Curtiu?" está na tela  
**Quando** sigo para outra tela sem responder  
**Então** o título fica só como "Já vi" (RNG004), sem sinal de gosto

### C4: Discrição

**Dado** que a pergunta está na tela  
**Então** ela não usa a cor de destaque (CM003): o controle principal da tela continua sendo o de sempre  
**E** os botões têm área de toque de 44 px ou mais

## Regras de negócio específicas

- **RNE001 – Um voto por título.** Responder de novo, num título que voltou (por exemplo, na indicação do dia, que ignora "Já vi"), troca o sinal anterior.
- **RNE002 – Só no navegador.** O sinal fica no localStorage (US009 RNE001) e só sai do navegador dentro de um pedido de sorteio (US009). Nenhum evento, log ou tabela guarda o sinal.
