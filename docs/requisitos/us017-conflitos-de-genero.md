# US017 – Conflitos de gênero

Kinne · Ajustes do MVP · versão de 01/11/2026

|                |                             |
| -------------- | --------------------------- |
| **Tela**       | Filtros                     |
| **Depende de** | US002, US008, US009, RNG003 |
| **Leva a**     | US004 (Ver um título)       |

## Descrição

Eu, como pessoa que escolhe um gênero nos filtros, quero que os títulos tenham a ver com o que pedi, para que pedir Comédia não me traga um suspense pesado.

## Critérios de aceitação

### C1: Excluir títulos em conflito

**Dado** que marquei um gênero nos filtros  
**Quando** o contador conta ou o sorteio escolhe  
**Então** o sistema não considera os títulos que também têm um gênero em conflito com o pedido (RNE001)  
**E**, ao pedir Comédia, não recebo Parasita (Comédia, Thriller, Drama)

### C2: Vários gêneros marcados

**Dado** que marquei mais de um gênero  
**Quando** um título tem ao menos um gênero pedido sem conflito  
**Então** o título continua na lista  
**E** um gênero que também pedi nunca conta como conflito

### C3: Nada sobra depois dos conflitos

**Dado** que todos os títulos que combinam estão em conflito  
**Quando** o contador conta ou o sorteio escolhe  
**Então** o sistema desconsidera os conflitos  
**E** mantém o desconto por gênero extra na ordem

### C4: Títulos mais puros sobem

**Dado** que marquei um gênero, sem sentimento e sem sinais de gosto  
**Quando** o sistema monta as rodadas  
**Então** a ordem segue a nota ajustada (RNE002)  
**E** uma obra muito bem avaliada com vários gêneros ainda pode ficar à frente de um título puro

### C5: O gosto continua mandando

**Dado** que tenho sinais de gosto que ordenam a lista  
**Quando** o sistema monta as rodadas  
**Então** a ordem vem do grafo de gosto, sem o desconto (US009)

## Regras de negócio específicas

- **RNE001 – Tabela de conflitos.** Comédia exclui Terror, Thriller e Guerra. Romance exclui Terror e Guerra. Família e Animação excluem Terror, Thriller e Crime. Terror e Suspense excluem Família. Drama e Ação não excluem nada. Guerra é só o gênero de filmes do TMDB (10752): "War & Politics", das séries, não conta. Mistério não é conflito, mas continua dentro do chip Suspense. Família, Animação e Terror ainda não têm chip: a regra só terá efeito na tela quando tiverem.
- **RNE002 – Nota ajustada.** Nota ajustada = nota ponderada (US002 RNE003) − 0,10 × gêneros extras. Gênero extra é todo gênero do TMDB do título que não pertence a um gênero pedido. Empate vai para mais votos e depois para o menor id.
- **RNE003 – Quando não vale.** O desconto não vale sem gênero marcado (seguem as cotas de US002 RNE005), com sentimento (US008) nem quando o gosto dá a ordem (US009). O piso de nota continua igual.
- **RNE004 – Fora do escopo.** A sala de grupo, o Me surpreenda e as indicações do dia não mudam.

## Segurança

- Nenhuma entrada nova: o pedido continua validado pelo schema estrito de `filterRequestSchema`, e a tabela é fixa no código.
- A lista do contador passa a incluir os ids de gênero do TMDB de cada título, dado público do catálogo.
