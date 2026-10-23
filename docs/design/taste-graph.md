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
- **A recomendação só vale inteira quando a obra a confirma** (decisão de 2026-10-23): com dados da obra a partir de **0,30**, vale 100%; abaixo disso, em proporção (0,15 de obra → metade). Na 3ª calibração, o TMDB ligava Chernobyl a Off Campus com obra 0,15, por popularidade.

### 4.3 Portão mínimo

Um par só vira aresta se os **dados da obra** valerem pelo menos **0,05** (um gênero em três já basta), mesmo que o TMDB recomende um ao outro. Na 2ª calibração (2026-10-23), sem esse portão, o TMDB ligava títulos sem nada em comum por pura popularidade (uma comédia romântica no gosto de quem curtiu Chernobyl).

### 4.4 Exemplo (ilustrativo)

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

Na prática: três rodadas de "espalhar" pontos pelos vizinhos, a partir dos títulos com sinal. Em cada rodada, os pontos que vão de um título A a um vizinho B são `pontos(A) × proximidade(A, B) / √(força(A) × força(B))`, em que força é a soma das proximidades de um título:

- dividir pela força de **A** impede que os pontos se multipliquem a cada rodada (um título com 40 vizinhos não pode mandar 40 vezes mais adiante);
- dividir pela força de **B** impede que títulos "no meio de tudo" acumulem pontos só por serem vizinhos de muita coisa. Na 1ª calibração (2026-10-23), sem essa divisão, Batman e Vingadores apareciam no gosto de quem curtiu Invocação do Mal, porque o TMDB recomenda títulos populares para quase tudo.

Os títulos com sinal não recebem pontuação.

**Ordem final, em três faixas:** primeiro o que o gosto alcançou (pontuação positiva), depois o neutro, por último o que está perto do que a pessoa não curtiu. A nota só ordena **dentro** de cada faixa (na 3ª calibração, Breaking Bad entrava no gosto de quem curtiu Invocação do Mal só pela nota). Dentro da faixa positiva: 80% `√(pontuação / maior pontuação)` + 20% percentil da nota ponderada. A divisão evita que o percentil apague a diferença entre vizinho direto e acaso (1ª calibração); a raiz evita que um vizinho fortíssimo, como a mesma franquia, achate todos os outros (3ª calibração). Sem nenhum sinal, vale a ordem que o Kinne já usa hoje.

## 7. Sala de grupo

A pontuação da seção 6, uma vez por membro, convertida em percentil. Para cada título vale o **percentil do membro menos satisfeito**. Os finalistas são os 3 a 5 primeiros, entre os que passam pelos filtros duros de todos.

## 8. Composição com o que já existe

**Piso de qualidade** (decisão de 2026-10-23): quando a pessoa tem sinais de gosto, os títulos que o gosto alcança não precisam da nota mínima de 6,4, só de **100 votos** (com menos, a nota e os temas do TMDB não são confiáveis). O Me surpreenda e o visitante sem sinais seguem com o piso de sempre. Quando as contas existirem, a mesma regra vale para o perfil.

**Filtros duros** (streaming, piso conforme acima, 18+, bloqueados, já vistos) → **elegibilidade do sentimento**, se houver → **ordenação** pelo gosto. O gosto só reordena o que os filtros deixaram; nunca acrescenta (modelo de ameaças, item A1).

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
