# US003 – Me surpreenda

Kinne · Requisitos da semana 0 · versão de 12/10/2026

|                |                                           |
| -------------- | ----------------------------------------- |
| **Tela**       | Inicial, levando à tela do título         |
| **Eventos**    | recommendation_shown (origem surprise_me) |
| **Depende de** | RNG001, RNG003, RNG004, CM001, CM002      |
| **Leva a**     | US004 (Ver um título)                     |

## Descrição

Eu, como visitante, quero receber um título bem avaliado sem escolher nada, para que eu descubra algo novo quando não sei o que quero ver.

## Critérios de aceitação

### C1: Pedir uma surpresa

**Dado** que estou na tela inicial  
**Quando** aciono "Me surpreenda"  
**Então** o sistema abre a tela do título com um título sorteado pelas RNE001 a RNE003, com origem "surpresa" (US004)

### C2: Respeitar os streamings

**Dado** que tenho streamings salvos no navegador  
**Quando** aciono "Me surpreenda"  
**Então** o título sorteado está em pelo menos um desses streamings  
**E**, sem streaming salvo, o sorteio considera todos (RNG003)

### C3: Não repetir na sessão

**Dado** que já recebi títulos de surpresa nesta sessão  
**Quando** peço outra surpresa, pela tela inicial ou por "Outra opção"  
**Então** o sistema não repete nenhum título já mostrado na sessão

## Regras de negócio específicas

- **RNE001 – Piso mais alto.** Exige nota TMDB de 7,5 ou mais (ponto de partida), além dos demais itens do piso (RNG001).
- **RNE002 – Filtros ignorados.** Gênero, tipo e duração não se aplicam; só os streamings são respeitados.
- **RNE003 – Sorteio.** Sorteio simples, sem os títulos marcados (RNG004) e sem limite de 10. Por isso, o estado "acabaram as opções" não ocorre nesta história.
- **RNE004 – Sem 18.** Títulos de classificação 18 nunca entram na surpresa, nem com o chip "18+" dos filtros marcado (RNG008).
