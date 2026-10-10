# 04 – Mudanças e pendências

Kinne · Requisitos da semana 0 · versão de 10/10/2026

## Pendências

### Decisões de produto

- [ ] Definir o que o botão "Entrar" faz na semana 0, já que o login vem depois. Até lá, ele aparece sem ação.
- [ ] Definir o tratamento de um título que deixa de passar no piso ou sai de todos os streamings (US007, RNE003).
- [ ] Definir o prazo definitivo de retenção de eventos no texto de privacidade completo (LGPD).

### Design

- [ ] Revisar a responsividade das demais telas no celular; a tela do título já foi revisada em 10/10/2026.
- [ ] Criar ilustrações para o quadro da imagem nos estados de erro e de fim das opções, hoje vazio.
- [ ] Testar no Safari do iPhone a barra de botões presa à base, o corte da sinopse em 4 linhas e o foco atrás da barra (US004, C9 e C11).
- [ ] Polimento da página /design: fonte de código do sistema (ui-monospace) como token de documentação, títulos de seção em text-title e espaço fixo entre a capa e a seção 01.

### Verificações no TMDB

- [x] Contar os títulos que passam no piso por gênero (referencia/contagem-do-catalogo.md): 500 votos e 10 melhores ficam.
- [ ] Ajustar os 60 dias de intervalo da indicação do dia e o 7,5 do Me surpreenda.
- [x] Conferir se Romance e Suspense existem como gêneros de série. Não existem; decisão na RNG007.
- [x] Conferir se as taglines vêm em português do Brasil. Vêm, mas faltam em parte das séries; regra na US004, RNE004.
- [ ] Conferir onde assistir no Brasil numa amostra de cerca de 20 títulos.
- [ ] Conferir se há link direto do título em cada streaming.
- [x] Conferir quantos títulos têm trailer, e quantos em português; regra na US004, RNE005.
- [ ] Conferir a frase de não endosso exigida pelos termos de uso do TMDB.

## Mudanças em relação ao resumo de passagem (09 e 10/10/2026)

| Ponto                   | Antes                                                              | Agora                                                                     |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Cor de destaque         | #DFFF4F                                                            | #FFF340                                                                   |
| Barra do topo           | Nome em Darker Grotesque                                           | Wordmark SVG original                                                     |
| Filtros                 | Streamings, gênero, nota, duração, ano                             | Streamings, tipo, gênero, nota, duração para filmes                       |
| Índice release_year     | Existe                                                             | Saiu                                                                      |
| Título na tela inicial  | Até 153px                                                          | ~72px computador, ~44px celular                                           |
| Ver este título         | Botão de vidro                                                     | Link com seta                                                             |
| Tela inicial no celular | Data na barra, quadro com margem                                   | Data acima do título, quadro de borda a borda                             |
| Rotação de capas        | Sem controle visível                                               | Botão de pausar                                                           |
| Tela do título          | Sem trailer                                                        | Botão "▶ Trailer"                                                         |
| Ações da tela do título | "Vou assistir", "Outra opção" e links "Já vi" e "Não me interessa" | "Vou assistir", "Já vi" e botão de dado, na mesma linha                   |
| Texto da tela do título | Frase curta                                                        | Chamada (tagline) e sinopse completa; no celular, 4 linhas com "Ler mais" |
| Nota na tela do título  | Na linha de dados                                                  | Grande, sobre a imagem, no canto oposto ao trailer                        |
| Botões no celular       | Abaixo do texto                                                    | Presos à base da tela                                                     |
| Não me interessa        | Na semana 0                                                        | Fica para depois                                                          |
| Forma dos controles     | Raios variados                                                     | Tudo em pílula; botões só de ícone são círculos                           |
| Gêneros de série        | Os cinco para filmes e séries                                      | Romance só para filmes; Suspense de série = Mistério (RNG007)             |
| Eventos                 | Cinco tipos                                                        | Seis tipos e recommendation_source                                        |
| Hospedagem              | Vercel                                                             | Vercel, com código portável (RNF11)                                       |
| Aviso do rodapé         | "Conta visitas de forma anônima"                                   | "Conta visitas sem identificar quem você é"                               |
