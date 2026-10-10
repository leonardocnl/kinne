# 03 – Medição da semana 0

Kinne · Requisitos da semana 0 · versão de 09/10/2026

O teste de 26/10 a 01/11/2026 é medido por seis eventos gravados na tabela anonymous_usage_events, sem etapa manual. Os cinco critérios são calculados depois, a partir desses eventos.

## Critérios do teste

| Critério            | Meta         | Cálculo                                                 |
| ------------------- | ------------ | ------------------------------------------------------- |
| Retorno (principal) | 30% ou mais  | Navegadores com eventos em 2 ou mais dias ÷ navegadores |
| Alcance             | 15 ou mais   | Navegadores distintos com app_opened                    |
| Conclusão           | 70% ou mais  | Visitas com recommendation_shown ÷ visitas              |
| Novidade            | 40% ou menos | already_watched_clicked ÷ recommendation_shown          |
| Intenção            | 40% ou mais  | Visitas com will_watch_clicked ÷ visitas                |

Pela ME02, a meta de Conclusão exige que 7 em cada 10 visitas vão além da tela inicial.

## Definições

- **ME01 – Visita.** Sequência de eventos de um mesmo navegador; termina após 30 minutos sem eventos. É calculada na análise, sem coluna no banco.
- **ME02 – Chegar a uma recomendação.** A visita tem pelo menos um recommendation_shown, ou seja, abriu a tela do título. Ver as indicações na tela inicial não conta.
- **ME03 – Dia.** Contado no horário de Brasília (RNG006).
- **ME04 – Equipe fora da conta.** Navegadores marcados como da equipe não enviam eventos (US006).

## Eventos

| Evento                  | Quando é registrado                                | História     |
| ----------------------- | -------------------------------------------------- | ------------ |
| app_opened              | O app abre, pela tela inicial ou por link          | US001, US004 |
| recommendation_shown    | A tela do título mostra um título                  | US004, US005 |
| will_watch_clicked      | "Vou assistir"                                     | US005        |
| already_watched_clicked | "Já vi"                                            | US005        |
| another_option_clicked  | Botão do dado ("Outra opção" ou "Próxima de hoje") | US004        |
| trailer_opened          | "▶ Trailer"                                        | US004        |

O recommendation_shown é registrado na abertura da tela do título e a cada nova opção mostrada, com a coluna recommendation_source ('daily_pick', 'filtered' ou 'surprise_me'). A rotação de capas e as trocas na faixa "Hoje" não geram eventos. Os eventos do teste são apagados até 15/11/2026 (RNF10).
