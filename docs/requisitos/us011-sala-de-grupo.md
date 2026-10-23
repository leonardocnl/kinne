# US011 – Sala de grupo

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026

|                |                                                                                      |
| -------------- | ------------------------------------------------------------------------------------ |
| **Telas**      | Criar sala, Entrar na sala, Sala (preferências → finalistas → votação → resultado)   |
| **Eventos**    | Nenhum novo nesta versão                                                             |
| **Depende de** | US002, US004, US009, RNG001 a RNG008, CM001 a CM004, `docs/design/taste-graph.md` §7 |
| **Ameaças**    | `docs/threats/group-room.md`                                                         |
| **Leva a**     | US004 (Ver um título), com o título vencedor                                         |

## Descrição

Eu, como visitante assistindo com outras pessoas, quero que cada um diga o que topa no próprio celular, para que o Kinne proponha poucas opções que agradem a todos e a gente decida rápido, sem discussão.

## Critérios de aceitação

### C1: Porta de entrada

**Dado** que estou na tela inicial  
**Quando** a tela aparece  
**Então** há um link discreto "Assistir em grupo" abaixo do par "Escolher agora" / "Me surpreenda", sem a cor de destaque (CM003)  
**Quando** aciono o link  
**Então** o sistema mostra duas ações: "Criar uma sala" (principal) e "Entrar com um código"

### C2: Criar a sala

**Dado** que acionei "Criar uma sala"  
**Quando** confirmo  
**Então** o sistema cria a sala e me põe nela como quem criou  
**E** mostra o código da sala em letras grandes, no formato `XXXX-XXXX` (RNE001), e um QR code que leva à sala  
**E** mostra "Aguardando pessoas: 1 na sala", que se atualiza sozinho (RNE007)

### C3: Entrar pelo QR code

**Dado** que alguém criou uma sala  
**Quando** leio o QR code com a câmera do celular  
**Então** o Kinne abre direto na sala e me põe nela  
**E** o endereço da barra passa a ser `/sala`, sem o código (RNE002)

### C4: Entrar pelo código

**Dado** que acionei "Entrar com um código"  
**Quando** digito o código e confirmo  
**Então** o sistema me põe na sala  
**Quando** o código não existe, expirou, a sala está cheia ou já começou  
**Então** o sistema mostra "Não encontramos essa sala. Confira o código com quem criou." (a mesma mensagem nos quatro casos, RNE003)

### C5: Marcar o que topo

**Dado** que estou na sala, antes de começar  
**Quando** a sala aparece  
**Então** o sistema mostra os campos:

| Campo      | Tipo             | Obg | Quem marca  | Validações                                        | Exemplo   | Valor padrão           |
| ---------- | ---------------- | --- | ----------- | ------------------------------------------------- | --------- | ---------------------- |
| Streamings | Seleção múltipla | Não | Cada pessoa | Streamings participantes (RNG002)                 | "Netflix" | Os salvos no navegador |
| Gêneros    | Seleção múltipla | Não | Cada pessoa | Os cinco gêneros do Kinne; nenhum vale como todos | "Comédia" | Nenhum                 |
| Tipo       | Seleção simples  | Sim | Quem criou  | "Filmes", "Séries", "Os dois"                     | "Filmes"  | "Os dois"              |
| Duração    | Slider           | Sim | Quem criou  | Como US002; só com Filmes                         | "Até 2h"  | "Qualquer"             |

**E** um botão "Pronto" para cada pessoa  
**E** a lista de quem está na sala, como "Pessoa 1", "Pessoa 2"…, com a marca "pronto" de cada uma (RNE004)

### C6: Começar

**Dado** que sou quem criou a sala  
**Quando** pelo menos duas pessoas estão prontas  
**Então** o botão "Ver as opções" (principal) fica ativo  
**Quando** aciono "Ver as opções"  
**Então** a sala para de aceitar gente nova  
**E** o sistema propõe de 3 a 5 finalistas a todos ao mesmo tempo (RNE005)

### C7: Votar

**Dado** que os finalistas estão na tela  
**Quando** os vejo  
**Então** cada finalista aparece com cartaz, título, ano, onde está disponível e um botão "Eu toparia"  
**E** posso marcar quantos quiser e depois acionar "Votar"  
**E** vejo "N de M já votaram", sem ver em quem cada pessoa votou

### C8: Resultado

**Dado** que todas as pessoas votaram, ou quem criou acionou "Encerrar votação"  
**Quando** o resultado sai  
**Então** todos veem o vencedor: o finalista com mais "Eu toparia" (RNE006)  
**E** a ação "Ver este título" leva à tela do título (US004)

### C9: Ninguém topou

**Dado** que nenhum finalista teve "Eu toparia"  
**Quando** o resultado sai  
**Então** todos veem "Ninguém topou nenhum. Bora outra rodada?"  
**E** quem criou vê "Outra rodada" (principal), que propõe novos finalistas, sem repetir os anteriores

### C10: Sair e expirar

**Dado** que estou numa sala  
**Quando** aciono "Sair da sala"  
**Então** o sistema me tira da sala e volta à tela inicial  
**E** uma sala expira 3 horas depois de criada, ou 30 minutos depois do resultado; depois disso, quem abrir `/sala` vê "Esta sala terminou." e "Voltar ao início"

## Regras de negócio específicas

- **RNE001 – Código.** 8 caracteres de um alfabeto de 31, sem os que se confundem (sem 0, O, 1, I, L), mostrados como `XXXX-XXXX` e aceitos com ou sem hífen, maiúsculas ou minúsculas. Gerado no servidor com gerador criptográfico. Cerca de 40 bits: adivinhar não é viável com o limite de tentativas (ameaças A1).
- **RNE002 – Endereço.** O QR code leva a `/sala/XXXX-XXXX` (o código no caminho, nunca em query param). Ao abrir, o navegador entra na sala por um pedido ao servidor e troca o endereço por `/sala` (`history.replaceState`), para o código não ficar no histórico nem ser compartilhado sem querer. Quem entra recebe um cookie de membro (ameaças B1); daí em diante a sala é reconhecida pelo cookie, não pelo código.
- **RNE003 – Erro único.** Código inexistente, expirado, sala cheia e sala já começada dão a mesma resposta, para o código não poder ser sondado.
- **RNE004 – Sem nomes.** Pessoas aparecem como "Pessoa 1", "Pessoa 2"… na ordem de entrada. Sem campo de nome nesta versão (ameaças C3).
- **RNE005 – Finalistas.** Candidatos: títulos recomendáveis no piso de US002, sem classificação 18, disponíveis em pelo menos um streaming marcado por alguém (o grupo assiste numa tela só), com um gênero aceito por cada pessoa que marcou gêneros (nenhum vale como todos), no tipo e na duração de quem criou, e fora do "Já vi" de cada pessoa. Ordem: `groupScores` (o percentil do menos satisfeito, design §7) sobre o gosto de cada um (US009); quem não tem sinais não restringe. Sem sinal em ninguém, a ordem é a nota ponderada. Finalistas: os 5 primeiros; com menos de 5 candidatos, todos; com menos de 3, a sala mostra "Poucas opções com essas escolhas. Desmarquem algum filtro." e volta às preferências.
- **RNE006 – Vencedor.** Mais "Eu toparia"; empate vai para a maior pontuação do grupo e depois para a nota ponderada.
- **RNE007 – Atualização.** Cada celular pergunta o estado da sala a cada 2,5 segundos enquanto a aba está visível, e para quando a aba some ou a sala termina (ameaças D2).
- **RNE008 – Limites.** Até 8 pessoas por sala; até 3 rodadas por sala; um navegador cria no máximo 3 salas por hora.
- **RNE009 – O que o servidor guarda.** Da pessoa, só o necessário para a sala: o hash do cookie, as preferências, os ids do "Já vi" e os sinais de gosto que o navegador mandou ao entrar, e os votos. Tudo é apagado quando a sala expira (ameaças C2).
