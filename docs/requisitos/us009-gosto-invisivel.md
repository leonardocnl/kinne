# US009 – Gosto invisível

Kinne · Requisitos do pós-MVP · proposta de 23/10/2026, aguardando aprovação

|                |                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Tela**       | Nenhuma nova (muda a ordem do "Escolher agora" e do "Me surpreenda")                     |
| **Eventos**    | Nenhum novo; recommendation_shown segue como é                                           |
| **Depende de** | US002, US003, US005, US010, RNG001, RNG004, RNG005, `docs/design/taste-graph.md` §6 e §8 |
| **Ameaças**    | `docs/threats/feelings-and-taste-ui.md`, `docs/threats/taste-graph.md`                   |

## Descrição

Eu, como visitante, quero que o Kinne aprenda com o que eu marco, para que as indicações fiquem mais parecidas com o que eu gosto sem eu precisar configurar nada.

## Critérios de aceitação

### C1: Sem sinais, nada muda

**Dado** que o navegador não tem nenhum sinal de gosto (RNE001)  
**Quando** sorteio pelo "Escolher agora" ou pelo "Me surpreenda"  
**Então** a ordem e o piso são os de hoje (US002 RNE003, US003)

### C2: Com sinais, o "Escolher agora" segue o gosto

**Dado** que o navegador tem ao menos um sinal positivo  
**Quando** sorteio pelo "Escolher agora"  
**Então** as rodadas de 10 seguem a ordem do gosto (RNE002) sobre os títulos que passam nos filtros  
**E** um título que o gosto alcança pode entrar mesmo abaixo da nota mínima, desde que tenha 100 votos ou mais (RNE003)

### C3: Com sinais, o "Me surpreenda" puxa para o gosto

**Dado** que o navegador tem ao menos um sinal positivo  
**Quando** aciono "Me surpreenda"  
**Então** o sorteio é entre os 30 primeiros na ordem do gosto, entre os títulos que passam no piso do Me surpreenda (US003 RNE001)  
**E** o piso não muda: o Me surpreenda segue com nota 7,5 e 500 votos

### C4: Nada aparece na tela

**Dado** que o gosto mudou a ordem  
**Quando** vejo um título  
**Então** a tela é a mesma de hoje: nenhum rótulo, selo ou explicação de "por que este título"

### C5: Esquecer o gosto

**Dado** que limpei os dados do site no navegador  
**Quando** volto ao Kinne  
**Então** o gosto recomeça do zero (C1)

## Regras de negócio específicas

- **RNE001 – Sinais.** Guardados no localStorage, numa chave só (`kinne:taste`), como listas de ids: curti (👍 de US010), não curti (👎 de US010) e vou assistir (US005 C1). Cada lista guarda os 200 mais recentes; um título fica numa lista só (o sinal mais recente vale). "Outra opção" não é sinal: a pessoa só quis ver outra coisa agora.
- **RNE002 – Ordem do gosto.** `spreadTaste` e `rankByTaste` de `src/domain/taste-graph.ts`: os sinais se espalham por até três arestas do grafo (100%, 35%, 12%); a ordem tem três faixas (alcançado pelo gosto, neutro, perto do que não curtiu) e, dentro da primeira, 80% gosto + 20% nota ponderada. Pesos: curti +1, vou assistir +0,6, não curti −1.
- **RNE003 – Piso com gosto.** Títulos que o gosto alcança (pontuação positiva) dispensam a nota mínima e precisam de 100 votos (`meetsTasteFloor`). Os demais seguem o piso de US002 (ou o slider de nota, se a pessoa o subiu). Classificação 18, bloqueados, streamings e "Já vi" continuam valendo sempre (decisão de 23/10/2026, 04).
- **RNE004 – Gosto com sentimento.** Com sentimento (US008) e sinais, a ordem do gosto vale sobre os títulos que o sentimento aceita e que estão na metade de cima da afinidade com ele; os de afinidade mais baixa vão para o fim.
- **RNE005 – Gosto com gênero.** Sem gênero marcado, as cotas por gênero de US002 RNE005 continuam, e dentro de cada gênero vale a ordem do gosto.
- **RNE006 – Grafo indisponível.** Se o grafo não carregar ou um título não tiver vizinhos, vale a ordem de hoje, sem erro na tela.
- **RNE007 – Exclusivo do perfil, depois.** Quando as contas existirem, os sinais passam do navegador para o perfil, com migração dos que já estão no navegador no primeiro login.
