# US013 – Onboarding

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026 (estrutura aprovada no MVP; obrigatoriedade e aproveitamento do navegador decididos em 23/10/2026)

|                |                                                               |
| -------------- | ------------------------------------------------------------- |
| **Telas**      | Onboarding (três passos)                                      |
| **Depende de** | US012, US015, US009 (sinais de gosto), RNG001, RNG002, RNG008 |
| **Ameaças**    | `docs/threats/accounts.md`                                    |
| **Leva a**     | Tela inicial (US001)                                          |

## Descrição

Eu, como pessoa que acabou de criar a conta, quero dizer o que amei, o que detestei e quais streamings assino, para que o Kinne já acerte nas primeiras indicações.

## Critérios de aceitação

### C1: Os passos

**Dado** que entrei pela primeira vez (US012 C4)  
**Quando** o onboarding abre  
**Então** o sistema mostra uma barra com a porcentagem concluída e o primeiro passo pendente:

| Passo | Título                        | O que escolho                             | Mínimo | Máximo |
| ----- | ----------------------------- | ----------------------------------------- | ------ | ------ |
| 1     | "3 títulos que você amou"     | Títulos, numa grade de cartazes com busca | 3      | 3      |
| 2     | "3 títulos que você detestou" | Títulos, numa grade de cartazes com busca | 3      | 3      |
| 3     | "Onde você assiste"           | Streamings participantes (RNG002)         | 0      | Todos  |

### C2: A grade e a busca

**Dado** que estou no passo 1 ou 2  
**Quando** o passo aparece  
**Então** a grade mostra títulos conhecidos do catálogo (os de mais votos entre os recomendáveis, sem classificação 18)  
**E** a busca encontra qualquer título do catálogo, como a busca de títulos que já existe  
**E** tocar num cartaz o marca; tocar de novo desmarca; com 3 marcados, "Continuar" (principal) fica ativo  
**E** um título marcado no passo 1 não aparece no passo 2, e vice-versa

### C3: Já vem preenchido

**Dado** que o navegador já tinha sinais de gosto ou streamings (US015)  
**Quando** abro um passo  
**Então** ele já vem com o que o navegador tinha: os "curti" mais recentes no passo 1, os "não curti" no passo 2, os streamings no passo 3, até o máximo de cada passo  
**E**, se o passo já está completo, mostro "Confirmar" no lugar de "Continuar"

### C4: Pular

**Dado** que estou em qualquer passo  
**Quando** aciono "Pular por agora"  
**Então** o sistema segue para o próximo passo (ou para a tela inicial, no último), sem guardar o que estava pela metade  
**E** o perfil passa a mostrar "Complete seu gosto" enquanto houver passo pulado (US014)

### C5: Sair no meio

**Dado** que fechei o Kinne no meio do onboarding  
**Quando** volto, em qualquer aparelho, com a conta aberta  
**Então** o onboarding continua do primeiro passo não concluído, com o que eu já tinha marcado (RNE002)

### C6: Fim

**Dado** que concluí ou pulei o último passo  
**Quando** sigo  
**Então** o sistema leva à tela inicial

## Regras de negócio específicas

- **RNE001 – Viram sinais.** Os 3 amados viram "curti" (+1) e os 3 detestados, "não curti" (−1), com os mesmos pesos de US009 RNE002. Os streamings são os da conta (US014).
- **RNE002 – Progresso salvo.** Cada passo concluído é gravado na conta na hora. O que está marcado num passo ainda não concluído fica só na tela.
- **RNE003 – Nada abaixo de 50 votos na grade.** A grade usa só títulos recomendáveis (RNG001); a busca pode achar qualquer título do catálogo, porque a pessoa pode ter amado algo pouco conhecido.
