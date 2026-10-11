# Refinos visuais pendentes

Anotados durante a construção, para resolver depois do "fazer existir".

## Tela do título: fim das opções (US004 C3)

- O quadro da imagem fica vazio (já previsto no 04: ilustração para o estado de fim).
- No celular, "Mudar filtros" e "Ver de novo" ficam no fluxo do texto, e não presos à base como os botões da tela do título (C11).
- No celular, o estado de fim não tem o botão redondo de voltar sobre o quadro, que a tela do título tem.
- O contador dos filtros, lido como texto (leitor de tela, `textContent`), repete o número ("22" para 2) por causa da animação dos dígitos; vale conferir o que o leitor de tela anuncia.

## Endereço secreto da equipe (US006)

- A tela de confirmação reusa a tela de estado, com o quadro da imagem vazio; para uma tela que só a equipe vê, o quadro talvez nem precise existir.
