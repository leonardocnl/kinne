# US007 – Manter o catálogo atualizado

Kinne · Requisitos da semana 0 · versão de 12/10/2026

|                |                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Processo**   | GitHub Actions, uma vez por dia (03h17 de Brasília)                                        |
| **Tabelas**    | catalog_titles, catalog_title_genres, catalog_title_theme_keywords, streaming_availability |
| **Depende de** | RNG001, RNG002, RNF06, RNF08                                                               |
| **Alimenta**   | US001, US002, US003, US004                                                                 |

## Descrição

Eu, como equipe, quero que o catálogo seja atualizado todos os dias a partir do TMDB, para que as recomendações reflitam o que está disponível nos streamings.

## Critérios de aceitação

### C1: Executar diariamente

**Dado** que o agendamento está ativo no repositório  
**Quando** chega o horário diário  
**Então** o GitHub Actions executa a atualização a partir do TMDB

### C2: Gravar o catálogo inteiro e marcar o recomendável

**Dado** que a atualização está em execução  
**Quando** um título vindo do TMDB é avaliado  
**Então** o sistema grava todos os títulos por assinatura nos streamings participantes (RNG002), validados  
**E** grava os gêneros, as palavras-chave de tema, a disponibilidade por streaming, a classificação indicativa e os créditos (diretores e até 28 do elenco, na ordem, com o personagem; da pessoa, só id do TMDB e nome)  
**E** recalcula `is_recommendable`, a camada que as recomendações usam (RNG001)

### C3: Registrar a atualização

**Dado** que um título foi gravado ou atualizado  
**Então** o campo last_synced_at recebe o momento da atualização

### C4: Guardar só caminhos de imagem

**Dado** que um título tem pôster ou imagem larga  
**Então** o banco guarda apenas o caminho da imagem no TMDB, nunca o arquivo (RNF08)

## Regras de negócio específicas

- **RNE001 – Atraso aceitável.** O horário do agendamento pode atrasar alguns minutos sem prejuízo.
- **RNE002 – Atividade do repositório.** O agendamento pode ser desativado após 60 dias sem atividade no repositório (não conferido na documentação).
- **RNE003 – Títulos que deixam o piso.** O tratamento de um título que deixa de passar no piso ou sai de todos os streamings está pendente (ver 04). Por enquanto, nada é apagado.
