# US005 – Responder a uma recomendação

Kinne · Requisitos da semana 0 · versão de 09/10/2026

|                |                                                                   |
| -------------- | ----------------------------------------------------------------- |
| **Tela**       | Título                                                            |
| **Eventos**    | will_watch_clicked, already_watched_clicked, recommendation_shown |
| **Depende de** | RNG004, RNG005, CM003                                             |
| **Vem de**     | US004 (Ver um título)                                             |

## Descrição

Eu, como visitante, quero dizer se vou assistir ou se já vi, para que o Kinne confirme minha escolha ou deixe de sugerir o que já vi.

## Critérios de aceitação

### C1: Vou assistir

**Dado** que estou na tela de um título  
**Quando** aciono "Vou assistir"  
**Então** os botões dão lugar à mensagem "Combinado. Está na [streaming].", como "Combinado. Está na Netflix."  
**E** o sistema exibe a ação "Voltar ao início"  
**E** não exibe botão para abrir o streaming

### C2: Já vi

**Dado** que estou na tela de um título  
**Quando** aciono "Já vi"  
**Então** o sistema marca o título como já visto naquele navegador  
**E** exibe por alguns segundos uma linha de confirmação, como "Anotado: você já viu Corra!"  
**E** mostra na hora a próxima opção, conforme a origem (US004, RNE001)

### C3: Título marcado não volta

**Dado** que marquei um título como "Já vi"  
**Quando** peço novas recomendações por filtros ou surpresa, no mesmo navegador  
**Então** o sistema não recomenda esse título  
**E** o título ainda pode aparecer na indicação do dia (RNG004)

## Regras de negócio específicas

- **RNE001 – Contagem das 10.** Um título marcado vindo dos filtros conta como uma das 10 opções (US002, RNE003).
- **RNE002 – Sem desfazer.** A marcação não pode ser desfeita na semana 0; só se apaga se a pessoa limpar os dados do navegador.
- **RNE003 – Diferença para "Outra opção".** "Outra opção" só pula o título, sem marcar; ele pode voltar em outra visita.
- **RNE004 – Sem "Não me interessa".** A marcação de desinteresse fica para depois do modo visitante (00, Escopo).
