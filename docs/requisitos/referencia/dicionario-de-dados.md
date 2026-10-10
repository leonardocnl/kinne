# Dicionário de dados

Kinne · Referência · base de 10/10/2026

O banco tem 14 tabelas em três grupos: catálogo (8), pessoas (5) e medição (1). Tipos do PostgreSQL (Neon). Na semana 0 existem só as 9 marcadas como **semana 0**; as de pessoas entram com o login. O esquema em código fica em `src/infrastructure/db/schema.ts`; se divergir deste documento, avise.

## Nomenclatura

| Regra                                            | Exemplo                             |
| ------------------------------------------------ | ----------------------------------- |
| Inglês, snake_case                               | catalog_titles                      |
| Tabelas no plural e por extenso                  | streaming_services, e não providers |
| Chave estrangeira com o nome da tabela de origem | catalog_title_id → catalog_titles   |
| Unidade no nome                                  | runtime_minutes                     |
| Origem no nome quando vem de fora                | tmdb_average_rating                 |
| Datas terminam em _at ou _date                   | created_at, pick_date               |
| Valores fixos por extenso                        | 'already_watched', e não 1          |

## Catálogo (cópia do TMDB, atualizada diariamente — US007)

### catalog_titles · semana 0

| Coluna                | Tipo         | Obrig. | Chave | Descrição                                                                                                |
| --------------------- | ------------ | ------ | ----- | -------------------------------------------------------------------------------------------------------- |
| id                    | integer      | Sim    | PK    | Identificador interno                                                                                    |
| tmdb_id               | integer      | Sim    |       | Id no TMDB; único junto com title_type                                                                   |
| title_type            | text         | Sim    |       | 'movie' ou 'series'                                                                                      |
| slug                  | text         | Sim    |       | Endereço do título, como 'corra-2017' (US004, C7). Único e estável                                       |
| display_title         | text         | Sim    |       | Nome em português                                                                                        |
| original_title        | text         | Sim    |       | Nome no idioma original                                                                                  |
| tagline               | text         | Não    |       | Tagline em português. Tela do título: some quando vazia. Tela inicial: vazia → primeira frase da sinopse |
| synopsis              | text         | Não    |       | Sinopse completa em português                                                                            |
| poster_image_path     | text         | Não    |       | Caminho do pôster no TMDB                                                                                |
| backdrop_image_path   | text         | Não    |       | Caminho da imagem larga no TMDB                                                                          |
| trailer_youtube_key   | text         | Não    |       | Código do trailer no YouTube (US004, RNE005)                                                             |
| trailer_language_code | char(2)      | Não    |       | Idioma do trailer ('pt', 'en'…)                                                                          |
| release_year          | smallint     | Não    |       | Ano de lançamento ou estreia                                                                             |
| runtime_minutes       | smallint     | Não    |       | Duração; em séries, a de um episódio típico                                                              |
| tmdb_average_rating   | numeric(3,1) | Sim    |       | Nota média no TMDB                                                                                       |
| tmdb_vote_count       | integer      | Sim    |       | Votos da nota                                                                                            |
| last_synced_at        | timestamptz  | Sim    |       | Última atualização vinda do TMDB                                                                         |

### genres · semana 0

| Coluna      | Tipo    | Obrig. | Chave | Descrição                                                                                    |
| ----------- | ------- | ------ | ----- | -------------------------------------------------------------------------------------------- |
| id          | integer | Sim    | PK    | Identificador interno                                                                        |
| tmdb_id     | integer | Sim    |       | Id do gênero no TMDB. Único                                                                  |
| name        | text    | Sim    |       | Nome em português                                                                            |
| kinne_genre | text    | Não    |       | 'action', 'comedy', 'drama', 'romance' ou 'suspense' (RNG007); vazio para gêneros não usados |

Correspondência (RNG007): 28 e 10759 → action; 35 → comedy; 18 → drama; 10749 (só filme) → romance; 53 e 9648 → suspense.

### catalog_title_genres · semana 0

PK (catalog_title_id, genre_id), ambas FK. Índice (genre_id, catalog_title_id).

### theme_keywords · semana 0

| Coluna  | Tipo    | Obrig. | Chave | Descrição                     |
| ------- | ------- | ------ | ----- | ----------------------------- |
| id      | integer | Sim    | PK    | Identificador interno         |
| tmdb_id | integer | Sim    |       | Id da etiqueta no TMDB. Único |
| name    | text    | Sim    |       | Texto da etiqueta             |

### catalog_title_theme_keywords · semana 0

PK (catalog_title_id, theme_keyword_id), ambas FK. Índice (theme_keyword_id, catalog_title_id).

### streaming_services · semana 0

| Coluna          | Tipo    | Obrig. | Chave | Descrição                                                               |
| --------------- | ------- | ------ | ----- | ----------------------------------------------------------------------- |
| id              | integer | Sim    | PK    | Identificador interno                                                   |
| tmdb_id         | integer | Sim    |       | Netflix 8, Max 1899, Prime Video 119, Disney+ 337, Globoplay 307. Único |
| name            | text    | Sim    |       | Nome do serviço                                                         |
| logo_image_path | text    | Não    |       | Caminho do logotipo no TMDB                                             |

### streaming_availability · semana 0

PK (streaming_service_id, catalog_title_id, country_code char(2), sempre 'BR' no MVP). Índice em catalog_title_id.

### daily_picks · semana 0

As cinco indicações de cada dia, iguais para todos (US001). Base da regra dos 60 dias e da cópia diária da tela inicial (RNF07).

| Coluna           | Tipo    | Obrig. | Chave | Descrição                            |
| ---------------- | ------- | ------ | ----- | ------------------------------------ |
| pick_date        | date    | Sim    | PK    | Dia, no horário de Brasília (RNG006) |
| kinne_genre      | text    | Sim    | PK    | Gênero do Kinne                      |
| catalog_title_id | integer | Sim    | FK    | Título indicado                      |

Índice (catalog_title_id, pick_date).

## Medição

### anonymous_usage_events · semana 0

Sem nome, e-mail, IP nem ligação com users (RNF09). Apagados até 15/11/2026 (RNF10).

| Coluna                | Tipo        | Obrig. | Chave | Descrição                                                                                                             |
| --------------------- | ----------- | ------ | ----- | --------------------------------------------------------------------------------------------------------------------- |
| id                    | bigint      | Sim    | PK    | Identificador                                                                                                         |
| anonymous_browser_id  | uuid        | Sim    |       | Código aleatório do navegador                                                                                         |
| event_name            | text        | Sim    |       | app_opened, recommendation_shown, will_watch_clicked, already_watched_clicked, another_option_clicked, trailer_opened |
| recommendation_source | text        | Não    |       | Só em recommendation_shown: daily_pick, filtered, surprise_me                                                         |
| catalog_title_id      | integer     | Não    | FK    | Título envolvido                                                                                                      |
| occurred_at           | timestamptz | Sim    |       | Momento do evento                                                                                                     |

Índices: occurred_at e (anonymous_browser_id, occurred_at).

## Pessoas (depois do modo visitante)

- **users:** id uuid PK, email text único, created_at, onboarding_completed_at.
- **user_streaming_subscriptions:** PK (user_id, streaming_service_id).
- **onboarding_title_choices:** PK (user_id, catalog_title_id), reaction 'loved' | 'hated', created_at.
- **user_title_feedback:** PK (user_id, catalog_title_id), feedback_type 'will_watch' | 'already_watched' | 'not_interested', created_at.
- **recommendation_history:** id bigint PK, user_id, catalog_title_id, recommendation_type 'daily_pick' | 'surprise_me' | 'filtered', shown_at. Índice (user_id, shown_at).
