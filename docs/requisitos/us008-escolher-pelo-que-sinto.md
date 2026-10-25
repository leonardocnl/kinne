# US008 – Escolher pelo que sinto

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026

|                |                                                                        |
| -------------- | ---------------------------------------------------------------------- |
| **Tela**       | Filtros (primeira seção do painel de US002)                            |
| **Eventos**    | recommendation_shown (origem filtered), sem campo novo                 |
| **Depende de** | US002, RNG001, RNG003, RNG004, RNG008, `docs/design/taste-graph.md` §5 |
| **Ameaças**    | `docs/threats/feelings-and-taste-ui.md`                                |
| **Leva a**     | US004 (Ver um título)                                                  |

## Descrição

Eu, como visitante, quero escolher o que quero sentir, para que eu receba um título que combine com o meu humor de agora, e não só com um gênero.

## Critérios de aceitação

### C1: Ver os sentimentos

**Dado** que abri os filtros (US002 C1)  
**Quando** o painel aparece  
**Então** a primeira seção, acima de Streamings, tem o título "O que você quer sentir hoje?" e o campo:

| Campo      | Tipo            | Obg | Validações                                                                                                                                                                    | Exemplo      | Valor padrão |
| ---------- | --------------- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------ |
| Sentimento | Seleção simples | Não | "Pra dar risada", "Pra chorar", "Pra roer as unhas", "Pra tomar susto", "Pra ficar quentinho", "Pra quebrar a cabeça", "Pra ver explosão", "Pra suspirar", "Baseado em fatos" | "Pra chorar" | Nenhum       |

**E** os sentimentos aparecem como chips, no mesmo estilo dos chips de gênero (preenchido quando marcado, sem ícone de "v")

### C2: Marcar e desmarcar

**Dado** que os filtros estão abertos  
**Quando** marco um sentimento  
**Então** o sistema desmarca o sentimento anterior, se havia um  
**Quando** toco no sentimento marcado  
**Então** o sistema o desmarca e volta a valer "nenhum"

### C3: Contador com sentimento

**Dado** que marquei um sentimento  
**Quando** o contador é atualizado (US002 C3)  
**Então** ele conta só os títulos que o sentimento aceita (RNE001), além dos demais filtros

### C4: Sentimento e gênero juntos

**Dado** que marquei um sentimento e um ou mais gêneros  
**Quando** sorteio um título  
**Então** o título passa nos dois: é aceito pelo sentimento **e** tem um dos gêneros marcados (RNE003)

### C5: Nenhum título combina

**Dado** que marquei um sentimento  
**Quando** nenhum título passa no sentimento e nos filtros  
**Então** vale US002 C4, com a mensagem "Tente outro sentimento ou marque mais um streaming."

### C6: Guardar o sentimento

**Dado** que marquei um sentimento  
**Quando** fecho e reabro os filtros na mesma aba  
**Então** o sentimento continua marcado  
**E**, ao fechar a aba, ele volta a "nenhum" (RNG005: fica no sessionStorage)

## Regras de negócio específicas

- **RNE001 – Quem o sentimento aceita.** Cada sentimento tem gêneros exigidos (o título precisa ter ao menos um), gêneros proibidos e, no caso de "Pra ficar quentinho", teto de classificação 12 (sem classificação, não entra). Documentário, reality e infantil nunca entram em sentimento nenhum. As regras estão em `src/domain/feelings.ts` (`feelingAllows`).
- **RNE002 – Ordem.** Com sentimento e sem sinais de gosto, as rodadas de 10 (US002 RNE003) seguem a ordem do sentimento (`rankByFeeling`: 70% afinidade com os temas da receita + 30% nota ponderada), no lugar da nota ponderada. Com sinais de gosto, vale US009 RNE002 sobre os títulos que o sentimento aceita.
- **RNE003 – Gênero junto.** Sentimento e gênero se somam ("e"). As cotas por gênero sem gênero marcado (US002 RNE005) não valem quando há sentimento: o sentimento já escolhe o tipo de título.
- **RNE004 – Só no servidor.** O navegador recebe, por título, só quais sentimentos o aceitam (um número com nove bits, um por sentimento), para o contador. Receitas, pesos, temas e afinidade ficam no servidor.
- **RNE005 – Fora do Me surpreenda e das indicações do dia.** Sentimento é só filtro do "Escolher agora".
- **RNE006 – Exclusivo de quem tem conta.** Com as contas (US012 a US015), o sentimento passa a ser exclusivo de quem tem conta, com convite para o visitante (US015 C3, RNE005; decisão de 23/10/2026).
