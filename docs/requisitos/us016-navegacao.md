# US016 – Navegação

Kinne · Requisitos do pós-MVP · decisão do dono de 25/10/2026 (navbar em todas as telas e busca no chip decididas no mesmo dia)

|                |                                      |
| -------------- | ------------------------------------ |
| **Telas**      | Início (US001) e Sobre               |
| **Depende de** | US001, DESIGN.md (seção "Navegação") |
| **Leva a**     | Início e Sobre, uma para a outra     |

## Descrição

Eu, como visitante, quero uma navegação curta e sempre à mão, para ir do início à página "Sobre" e voltar sem procurar links.

## Critérios de aceitação

### C1: Abas e busca

**Dado** que estou em qualquer tela do Kinne  
**Então** vejo um chip flutuante com a marca, que leva ao início, e as abas "Início" e "Sobre"  
**E**, ao lado do chip, a lupa da busca  
**E** não há abas para telas que ainda não existem (Explorar, Minha lista)

### C2: Posição

**Dado** que uso o computador  
**Então** o chip fica fixo no topo, centralizado  
**E** a data do dia fica à direita da barra do topo em tela larga  
**Dado** que uso o celular  
**Então** o chip fica fixo na base, centralizado, acima da área segura do aparelho  
**E**, na tela do título, fica logo acima das ações presas à base  
**E** a data segue acima do título

### C3: Aba ativa

**Dado** que estou no Início ou no Sobre  
**Então** a aba da tela tem `aria-current="page"` e a luz sobre ela (barra fina com brilho e cone de luz)  
**E** a luz é uma peça só e desliza para a aba nova na troca de página, quando o navegador permite e sem movimento reduzido  
**E** a luz é um traço amarelo na borda de baixo, com um brilho atrás do rótulo  
**E** as outras abas ficam em cor suave e sobem para a cor do texto no hover e no foco

### C4: Painéis

**Dado** que um painel ou modal está aberto (filtros, aviso)  
**Então** ele fica acima da navbar, e ela nunca o cobre  
**Dado** que estou numa tela que não é o Início nem o Sobre  
**Então** nenhuma aba fica ativa e não há luz

### C7: Buscar

**Dado** que toco na lupa  
**Então**, no computador, ela se alarga num campo de busca, empurrando o chip, com o botão de fechar dentro, e os resultados aparecem embaixo depois da primeira letra  
**E**, no celular, a busca abre em tela cheia, com o campo em cima  
**E** a busca não acende a luz nem marca `aria-current`, porque não é uma página

### C5: Sem cobrir conteúdo

**Dado** que a navbar existe  
**Então** o conteúdo e o rodapé nunca ficam escondidos por ela  
**E** o elemento em foco nunca fica sob ela (WCAG 2.4.11)

### C6: Leitura

**Dado** qualquer imagem atrás do chip, inclusive clara  
**Então** o texto do chip tem contraste de no mínimo 4,5:1 sobre o vidro (exceção da navbar à regra de 7:1, decisão do dono)

## Regras de negócio específicas

- **RNE001 – Sem JS de cliente novo.** A navbar é componente de servidor, sem estado nem leitura do caminho; o único JS é o botão de busca que já existia. Cada página diz qual aba está ativa. A luz fica pela posição da aba (índice) e desliza com o `ViewTransition` do React, sem JS de cliente novo; sem suporte ela aparece no lugar e, em `prefers-reduced-motion`, nada se move. Motivo: o orçamento de JS da tela inicial (150 KB gzip, RNF) já está no limite.
- **RNE002 – Sem eventos.** Trocar de aba não gera evento de medição.
