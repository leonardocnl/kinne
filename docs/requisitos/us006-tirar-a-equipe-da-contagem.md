# US006 – Tirar a equipe da contagem

Kinne · Requisitos da semana 0 · versão de 09/10/2026

|                |                        |
| -------------- | ---------------------- |
| **Tela**       | Qualquer               |
| **Eventos**    | Nenhum; impede o envio |
| **Depende de** | RNG005, ME04           |

## Descrição

Eu, como membro da equipe, quero que meus navegadores não sejam contados, para que os números do teste reflitam apenas os participantes.

## Critérios de aceitação

### C1: Marcar o navegador da equipe

**Dado** que tenho o endereço secreto da equipe  
**Quando** abro o Kinne por esse endereço  
**Então** o sistema grava no localStorage uma marca de navegador da equipe

### C2: Não enviar eventos

**Dado** que o navegador tem a marca da equipe  
**Quando** uso o Kinne normalmente  
**Então** o app funciona igual  
**E** nenhum evento é enviado ao banco

### C3: Perder a marca

**Dado** que limpei os dados do navegador  
**Quando** abro o Kinne pelo endereço comum  
**Então** o navegador volta a ser contado até ser marcado de novo (C1)

## Regras de negócio específicas

- **RNE001 – Segredo fora do código.** O valor do endereço secreto fica numa variável de ambiente (TEAM_SECRET_PATH), fora do código e do repositório.
- **RNE002 – Uso restrito.** O endereço não é enviado a participantes. Quem o descobrir só consegue deixar de ser contado.
- **RNE003 – Todos os aparelhos.** Cada navegador e aparelho da equipe é marcado antes do início do teste.
