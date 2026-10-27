# US004 – Ver um título

Kinne · Requisitos da semana 0 · versão de 12/10/2026

|                |                                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| **Tela**       | Título                                                                              |
| **Eventos**    | app_opened (por link), recommendation_shown, another_option_clicked, trailer_opened |
| **Depende de** | RNG004, RNG007, CM001, CM002, CM003                                                 |
| **Vem de**     | US001, US002, US003 ou link compartilhado                                           |
| **Leva a**     | US005 (Responder a uma recomendação)                                                |

## Descrição

Eu, como visitante, quero ver um título por vez com as informações que me ajudam a decidir, para que eu escolha o que assistir sem comparar listas.

## Critérios de aceitação

### C1: Exibir o título

**Dado** que cheguei à tela do título pela indicação do dia, pelos filtros, por "Me surpreenda" ou por um link  
**Então** o sistema exibe os seguintes campos:

| Campo         | Tipo   | Descrição                                                                                                       | Exemplo                                                   |
| ------------- | ------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Imagem        | Imagem | Imagem larga, cantos retos                                                                                      | Cena de "Corra!"                                          |
| Nota TMDB     | Número | Sobre a imagem, no canto inferior direito, oposto ao trailer; grande, em branco, sem a cor de destaque (RNE006) | "7,6 TMDB"                                                |
| Título        | Texto  | Nome em português                                                                                               | "Corra!"                                                  |
| Chamada       | Texto  | Tagline em português, em branco; sem tagline, a linha não aparece (RNE004)                                      | "Um fim de semana que esconde algo errado."               |
| Sinopse       | Texto  | Sinopse completa em português (RNE004, C9)                                                                      | "Chris, um fotógrafo, vai passar o fim de semana…"        |
| Gênero        | Texto  | Gênero principal                                                                                                | "Suspense"                                                |
| Ano           | Número | Lançamento ou estreia                                                                                           | "2017"                                                    |
| Duração       | Texto  | Total; por episódio em séries                                                                                   | "1h 44min"                                                |
| Disponível em | Texto  | Streamings do título, na ordem fixa; some sem streaming                                                         | "Netflix e Max"                                           |
| Direção       | Texto  | "Direção de X", "X e Y" ou "X, Y e Z"; some sem dado                                                            | "Direção de Jordan Peele"                                 |
| Elenco        | Texto  | "Com A, B e C": os três primeiros, na ordem dos créditos; some sem dado                                         | "Com Daniel Kaluuya, Allison Williams e Bradley Whitford" |

**E** exibe, numa mesma linha e nesta ordem, três botões em forma de pílula: "Vou assistir" (principal, com a cor de destaque), "Já vi" (secundário, com ícone de visto) e "Outra opção" (só com ícone de dado, em círculo)  
**E** o botão do dado tem o nome "Outra opção" para leitores de tela e na dica ao passar o mouse  
**E** exibe o botão "▶ Trailer" sobre a imagem, no canto inferior esquerdo, quando houver trailer (RNE005)

### C2: Outra opção, vindo dos filtros

**Dado** que cheguei pelos filtros  
**Quando** aciono "Outra opção"  
**Então** o sistema mostra outro título da mesma rodada de 10, sem repetir (US002, RNE003)

### C3: Acabou a rodada

**Dado** que cheguei pelos filtros e já vi os títulos da rodada  
**Quando** aciono "Outra opção"  
**Então** o sistema exibe "Você viu as 10 melhores para esses filtros" (depois da primeira rodada) ou "Você viu mais 10 para esses filtros"  
**E** exibe as ações "Sortear entre os próximos 10" (principal), ou "Sortear entre os últimos N" quando a rodada seguinte é a última e menor, e "Mudar filtros"  
**Quando** já vi todas as rodadas  
**Então** o sistema exibe "Você viu todos os N títulos", com N os que combinam  
**E** exibe as ações "Mudar filtros" (principal) e "Recomeçar"  
**Quando** aciono "Mudar filtros"  
**Então** o sistema reabre os filtros  
**Quando** aciono "Recomeçar"  
**Então** o sistema volta à primeira rodada, do começo

### C4: Outra opção, vindo da surpresa ou de um link

**Dado** que cheguei por "Me surpreenda" ou por um link compartilhado  
**Quando** aciono "Outra opção"  
**Então** o sistema faz um novo sorteio surpresa (US003)

### C5: Próxima de hoje, vindo da indicação do dia

**Dado** que cheguei pela indicação do dia  
**Então** o botão do dado passa a se chamar "Próxima de hoje", na mesma posição e com o mesmo ícone  
**Quando** aciono "Próxima de hoje"  
**Então** o sistema mostra a indicação seguinte do dia e volta à primeira depois da quinta

### C6: Ver o trailer

**Dado** que o título tem trailer  
**Quando** aciono "▶ Trailer"  
**Então** o sistema abre o trailer no YouTube, fora do Kinne  
**E**, se o título não tem trailer, o botão não aparece

### C7: Endereço próprio

**Dado** que estou na tela de um título  
**Então** o endereço identifica o título, no formato /titulo/corra-2017  
**Quando** uso o "voltar" do navegador ou o gesto de voltar do iPhone  
**Então** o sistema volta à tela inicial

### C8: Abrir por link compartilhado

**Dado** que recebi o endereço de um título  
**Quando** abro o endereço  
**Então** o sistema exibe aquele título, conforme o C1  
**E** o endereço não carrega os filtros de quem compartilhou

### C9: Ler a sinopse no celular

**Dado** que estou na tela do título numa tela de até 860px de largura  
**E** a sinopse passa de 4 linhas  
**Então** o sistema mostra as 4 primeiras linhas, terminadas em "…", e o link "Ler mais"  
**Quando** aciono "Ler mais"  
**Então** a sinopse abre por inteiro no mesmo lugar e o link passa a "Ler menos"  
**E** ao trocar de título, a sinopse volta a ficar recolhida

### C10: Disposição no computador

**Dado** que a tela tem mais de 860px de largura  
**Então** título, chamada e sinopse usam a largura toda, sem quebra forçada; a sinopse tem no máximo 80 caracteres por linha (critério AAA 1.4.8)  
**E** os botões ficam à direita, alinhados à primeira linha do título, e não mudam de lugar com o tamanho da sinopse; o texto vai até eles  
**E** a confirmação de "Vou assistir" ocupa o lugar e a altura da fileira de botões, sem deslocar o resto da página

### C11: Disposição no celular

**Dado** que a tela tem até 860px de largura  
**Então** os três botões ficam presos à base da tela e acompanham a rolagem, respeitando a área segura do aparelho  
**E** o elemento em foco nunca fica escondido atrás deles (WCAG 2.4.11)  
**E** a confirmação de "Já vi" aparece logo acima dos botões

## Regras de negócio específicas

- **RNE001 – Origem.** "Outra opção" depende da origem: filtros (C2, C3), surpresa ou link (C4) e indicação do dia (C5). A origem é registrada em recommendation_source.
- **RNE002 – Sem link para o streaming.** A tela não tem botão para abrir o título no streaming. A decisão parte da suposição, não conferida, de que o TMDB não fornece o link direto.
- **RNE003 – Ícone único.** O botão de outra opção usa o ícone de dado em todas as origens, inclusive na indicação do dia, em que não há sorteio; o nome lido por leitores de tela diz o que ele faz.
- **RNE004 – Chamada e sinopse.** A chamada é a tagline em português e some quando não existe; a sinopse aparece sempre, completa. Na contagem de 09/10/2026, só de 40% a 80% das séries tinham tagline, e 100% tinham sinopse.
- **RNE005 – Trailer.** O sistema usa o trailer do YouTube em português quando houver; senão, o trailer no idioma original. Na carga de 10/10/2026, 233 de 2.900 títulos ficaram sem trailer.
- **RNE006 – Nota sem cor de destaque.** A nota chama atenção pelo tamanho, não pela cor: o amarelo fica reservado ao controle principal (CM003). Como não é tocável, a nota é texto sobre a imagem, e não pílula.
