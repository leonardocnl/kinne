# US016 – Navegação

Kinne · Requisitos do pós-MVP · decisão do dono de 25/10/2026

|                |                                      |
| -------------- | ------------------------------------ |
| **Telas**      | Início (US001) e Sobre               |
| **Depende de** | US001, DESIGN.md (seção "Navegação") |
| **Leva a**     | Início e Sobre, uma para a outra     |

## Descrição

Eu, como visitante, quero uma navegação curta e sempre à mão, para ir do início à página "Sobre" e voltar sem procurar links.

## Critérios de aceitação

### C1: Abas

**Dado** que estou no Início ou no Sobre  
**Então** vejo um chip flutuante com duas abas: "Início" e "Sobre"  
**E** não há abas para telas que ainda não existem (Explorar, Minha lista)

### C2: Posição

**Dado** que uso o computador  
**Então** o chip fica fixo no topo, centralizado  
**E** a data do dia fica junto do botão Buscar  
**Dado** que uso o celular  
**Então** o chip fica fixo na base, centralizado, acima da área segura do aparelho  
**E** a data segue acima do título

### C3: Aba ativa

**Dado** que estou numa das duas telas  
**Então** a aba da tela tem `aria-current="page"` e a luz acesa (barra fina com brilho e cone de luz)  
**E** a luz usa a cor do texto, nunca o amarelo de destaque  
**E** as outras abas ficam em cor suave e sobem para a cor do texto no hover e no foco

### C4: Onde não aparece

**Dado** que estou na tela do título, na sala de grupo, na busca ou com um painel ou modal aberto  
**Então** a navbar não aparece, ou fica abaixo do painel, e nunca o cobre

### C5: Sem cobrir conteúdo

**Dado** que a navbar existe  
**Então** o conteúdo e o rodapé nunca ficam escondidos por ela  
**E** o elemento em foco nunca fica sob ela (WCAG 2.4.11)

### C6: Leitura

**Dado** qualquer imagem atrás do chip, inclusive clara  
**Então** o texto do chip tem contraste de no mínimo 7:1 sobre o vidro

## Regras de negócio específicas

- **RNE001 – Sem JS de cliente.** A navbar é componente de servidor, sem estado nem leitura do caminho. Cada página diz qual aba está ativa. A luz acende no lugar, com um fade curto, desligado em `prefers-reduced-motion`. Motivo: o orçamento de JS da tela inicial (150 KB gzip, RNF) já está no limite.
- **RNE002 – Sem eventos.** Trocar de aba não gera evento de medição.
