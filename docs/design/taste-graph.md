# Modelagem do grafo de gosto

Status: proposta de 2026-10-23, aguardando aprovação. Substitui a primeira versão (grafo bipartido título–característica com PageRank), descartada depois de três calibrações: ela tratava sentimento como problema de proximidade e deixava gêneros virarem hubs.

## 1. Para que serve

Uma estrutura única responde a duas perguntas:

- **Gosto invisível:** "o que é parecido com o que esta pessoa curtiu?" Ordena o "Escolher agora" e o "Me surpreenda" sem nenhum rótulo na tela.
- **Sala de grupo:** "o que agrada a todos os membros ao mesmo tempo?"

Os **sentimentos** ("Pra chorar", "Pra tomar susto"…) **não usam as ligações do grafo**. Eles respondem "este título dá susto?", e isso se decide olhando o próprio título (seção 5).

## 2. Tipo de grafo

**Grafo de vizinhos mais próximos entre títulos: não direcionado, ponderado.**

- **Vértice:** um título recomendável do catálogo, representado pelo objeto `TitleProfile` (seção 3).
- **Aresta:** a proximidade entre dois títulos, de 0 a 1, calculada pela conta da seção 4.
- **Cada título guarda só os seus 20 vizinhos mais próximos.** Ligar todos com todos daria milhões de arestas quase nulas. Se A está entre os 20 de B mas B não está entre os 20 de A, a aresta existe mesmo assim (o grafo é não direcionado).
- **Só títulos recomendáveis são vértices** (os ~2.900 que passam no piso de qualidade). Um vizinho fora do catálogo não serviria para nada.

## 3. O vértice: `TitleProfile`

O que importa de cada título para a pergunta "quem gostou deste gosta daquele?".

| Campo | Fonte no TMDB | Exemplo (Chernobyl) |
|---|---|---|
| `id` | catálogo do Kinne | 812 |
| `themes` | palavras-chave | desastre nuclear, encobrimento, União Soviética |
| `genres` | gêneros | Drama, História |
| `directors` / `creators` | créditos (direção) / `created_by` (séries) | Johan Renck / Craig Mazin |
| `writers` | créditos (roteiro) | Craig Mazin |
| `companies` | produtoras | HBO, Sky UK, Sister Pictures |
| `seriesType` | tipo da série | Minissérie |
| `collection` | coleção (só filmes) | — |
| `tmdbRecommendations` | recomendações do TMDB, na ordem | Olhos que Condenam, Band of Brothers… |
| `rating`, `votes` | nota e votos | 8,7 / 6.400 (só para desempate, nunca na proximidade) |
| `certification`, `type` | classificação, filme/série | 16, série (só para regras e filtros) |

Ficam de fora da proximidade, por não dizerem nada sobre gosto: ano, duração, temporadas, orçamento, bilheteria, idioma e país (decisão de 2026-10-23), elenco (decisão do MVP), formato filme/série (já é filtro).

## 4. A aresta: conta de proximidade

**proximidade(A, B) = 0,77 × dados_da_obra(A, B) + 0,23 × recomendação(A, B)**

### 4.1 Dados da obra (0 a 1)

| Parte | Peso | Como conta |
|---|---|---|
| Temas | 45% | Sobreposição ponderada por raridade (cosseno com IDF: um tema em 4 títulos pesa muito, um em 1.000 quase nada) |
| Gêneros | 15% | Fração de gêneros em comum (Jaccard) |
| Direção / criação | 20% | Pessoa em comum, ponderada por raridade |
| Roteiro | 10% | Pessoa em comum, ponderada por raridade |
| Produtora | 5% | Em comum, ponderada por raridade (A24 conta, Warner quase nada) |
| Tipo de série | 5% | Ambos minissérie, ou ambos série contínua |
| Coleção | bônus | Mesma franquia: dados_da_obra = 1 |

**Poda de temas:** saem os que aparecem em menos de 2 títulos (não ligam nada) e em mais de 5% do catálogo (metadado, não assunto: "woman director", "duringcreditsstinger"). O corte final sai da distribuição real.

### 4.2 Recomendação do TMDB (0 a 1)

- B na posição *p* (1 a 20) das recomendações de A vale `1 − (p − 1) / 20`.
- Se o TMDB recomenda nos dois sentidos, vale o maior dos dois mais metade do menor, limitado a 1.
- Recomendações para títulos fora do catálogo são descartadas.

### 4.3 Exemplo (ilustrativo)

| Comparado com Chernobyl | Dados da obra | Recomendação | Proximidade |
|---|---|---|---|
| Fukushima: Ameaça Nuclear | 0,70 | 0 | 0,54 |
| Olhos que Condenam | 0,30 | 0,90 | 0,44 |
| Breaking Bad | 0,08 | 0,30 | 0,13 |

## 5. Sentimentos

Classificação sobre o vértice, **sem andar pelo grafo**:

1. **Elegibilidade:** gêneros exigidos, gêneros proibidos, teto de classificação (calibrados em 2026-10-23).
2. **Afinidade:** soma dos pesos da receita para os temas que o título tem, cada um ponderado pela raridade.
3. **Ordem:** 70% afinidade + 30% nota ponderada.

## 6. Gosto invisível

**Sinais** guardados no navegador: curti (👍 no "Curtiu?"), vou assistir, não curti (👎), não me interessa.

**Pontuação de um título X**, em três passos:

```
pontos(X) = Σ sobre cada caminho de até 3 arestas de um título-sinal S até X:
            sinal(S) × produto das proximidades do caminho × amortecimento(passos)

amortecimento: 1 passo = 1,00 · 2 passos = 0,35 · 3 passos = 0,12
sinal: curti = +1 · vou assistir = +0,6 · não curti = −1 · não me interessa = −0,4
```

Na prática: três rodadas de "espalhar" pontos pelos vizinhos, a partir dos títulos com sinal. Em cada rodada, cada título reparte os seus pontos entre os vizinhos em proporção à proximidade, **dividindo pela soma das proximidades dele**: sem essa divisão, os pontos se multiplicariam a cada rodada (um título com 20 vizinhos passaria 20 vezes mais adiante) e o amortecimento não diria nada. Os títulos com sinal não recebem pontuação.

**Ordem final:** 80% pontuação de gosto (em percentil) + 20% nota ponderada. Sem nenhum sinal, vale a ordem que o Kinne já usa hoje.

## 7. Sala de grupo

A pontuação da seção 6, uma vez por membro, convertida em percentil. Para cada título vale o **percentil do membro menos satisfeito**. Os finalistas são os 3 a 5 primeiros, entre os que passam pelos filtros duros de todos.

## 8. Composição com o que já existe

**Filtros duros** (streaming, nota mínima, 18+, bloqueados, já vistos) → **elegibilidade do sentimento**, se houver → **ordenação** pelo gosto. O gosto só reordena o que os filtros deixaram; nunca acrescenta (modelo de ameaças, item A1).

## 9. Onde cada coisa vive

| Peça | Camada | Quando roda |
|---|---|---|
| `TitleProfile`, conta de proximidade, escolha dos 20 vizinhos | `domain` (funções puras) | — |
| Construção do grafo | script `graph:build` no GitHub Actions | todo dia, depois da sincronização do catálogo |
| Arestas prontas | tabela `title_neighbors` (título, vizinho, proximidade, dados_da_obra, recomendação) | lida a cada recomendação |
| Gosto, sentimentos, grupo | `domain` + caso de uso em `application` | a cada pedido; nada personalizado vai para cache |

### Mudanças no banco e na sincronização

- `title_credits.role` passa a aceitar `creator` e `writer`, além de `director` e `cast`.
- `catalog_titles` ganha `series_type` e `collection_tmdb_id`.
- Novas tabelas: `production_companies`, `catalog_title_production_companies`, `tmdb_recommendations` (título, id e tipo do recomendado no TMDB, posição) e `title_neighbors`.
- A sincronização passa a pedir, na mesma requisição de cada título, as recomendações e os créditos completos (`append_to_response`); o número de requisições não muda.

## 10. Avaliação: o gabarito

Arquivo `src/domain/taste-graph.golden.ts`:

- **Por sentimento:** ~10 títulos que precisam estar entre os 30 primeiros e ~5 que não podem aparecer.
- **Por gosto:** perfis de exemplo ("curtiu Chernobyl e Breaking Bad, não curtiu Pânico") com títulos esperados entre os 30 primeiros e proibidos.

O script de calibração mostra **precisão** (quantos esperados entraram) e **violações** (quantos proibidos apareceram). Uma mudança de peso só entra se melhorar a precisão sem criar violação.
