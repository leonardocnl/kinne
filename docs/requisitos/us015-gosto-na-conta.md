# US015 – Gosto na conta

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026

|                |                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------- |
| **Telas**      | Nenhuma nova (muda de onde vêm o gosto, o "Já vi" e os streamings; convite nos sentimentos) |
| **Depende de** | US008, US009, US010, US012, RNG004, RNG005                                                  |
| **Ameaças**    | `docs/threats/accounts.md`                                                                  |

## Descrição

Eu, como pessoa com conta, quero que o meu gosto, o que já vi e os meus streamings fiquem na conta, para que o Kinne me conheça em qualquer aparelho e continue de onde parei.

## Critérios de aceitação

### C1: Levar o navegador para a conta

**Dado** que o navegador tinha sinais de gosto, "Já vi" ou streamings  
**Quando** entro na conta (US012 C4)  
**Então** o sistema junta tudo à conta (RNE002)  
**E** apaga essas chaves do navegador, que passa a ler da conta

### C2: Com a conta aberta, tudo vem da conta

**Dado** que estou com a conta aberta  
**Quando** marco "Já vi", respondo "Curtiu?", aciono "Vou assistir" ou mudo um streaming  
**Então** o sistema grava na conta  
**E** "Escolher agora", "Me surpreenda" e a sala de grupo usam o gosto, o "Já vi" e os streamings da conta, lidos no servidor (RNE003)

### C3: Sentimentos com convite

**Dado** que sou visitante  
**Quando** toco num sentimento nos filtros (US008)  
**Então** o sistema mostra "Crie sua conta para escolher pelo que sente." com a ação "Entrar" (US012)  
**E** o sentimento não é marcado

### C4: Sair limpa o navegador

**Dado** que estou com a conta aberta  
**Quando** saio (US012 C7) ou apago a conta (US014 C5)  
**Então** o navegador não guarda mais gosto, "Já vi" nem streamings, e volto a ser visitante do zero

## Regras de negócio específicas

- **RNE001 – O que continua no navegador.** O código do navegador (para os eventos anônimos), a marca da equipe (US006) e os filtros da sessão (RNG005) continuam no navegador, com ou sem conta.
- **RNE002 – Como juntar.** Sinais: para cada título, vale o sinal mais recente entre conta e navegador; os limites de US009 RNE001 (200 por lista) valem para a conta. "Já vi": união. Streamings: se a conta não tem nenhum, ficam os do navegador; se tem, ficam os da conta.
- **RNE003 – O servidor manda.** Com a conta aberta, o navegador não envia listas de gosto nem de "Já vi" nos pedidos de sorteio: o servidor lê da conta pela sessão. Um pedido com listas e com sessão usa só as da conta (ameaças A4).
- **RNE004 – Sair limpa.** Ao sair ou apagar a conta, o navegador apaga `kinne:taste`, `kinne:watched` e `kinne:streamings` (decisão de 23/10/2026: computador compartilhado não herda o gosto de quem saiu).
- **RNE005 – Sentimentos.** Passam a ser exclusivos de quem tem conta, como previsto em US008 RNE006. O servidor recusa sentimento em pedido sem sessão, além de a tela não deixar marcar.
