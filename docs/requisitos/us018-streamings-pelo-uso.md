# US018 – Streamings aprendidos pelo uso

Kinne · Ajustes do MVP · versão de 01/11/2026

|                |                                             |
| -------------- | ------------------------------------------- |
| **Tela**       | Tela do título, tela inicial                |
| **Depende de** | RNG002, RNG003, RNG005, US002, US004, US015 |
| **Leva a**     | US004 (Ver um título), US002 (filtros)      |

## Descrição

Eu, como visitante, quero informar meus streamings enquanto uso o Kinne, sem passo obrigatório, para receber indicações que consigo assistir.

## Critérios de aceitação

### C1: Sem streamings marcados

**Dado** que não marquei nenhum streaming  
**Quando** peço um sorteio  
**Então** o sistema considera todos os streamings participantes (RNG003)

### C2: Perguntar na linha "onde assistir"

**Dado** que o título está em um serviço que ainda não respondi  
**Quando** abro a tela do título  
**Então** o sistema mostra "Disponível na X · Você assina? Sim · Não" abaixo de "Onde assistir"  
**E**, se eu ignorar, nada muda

### C3: Responder

**Dado** que a pergunta está visível  
**Quando** aciono "Sim"  
**Então** o sistema não pergunta mais sobre o serviço e não restringe o sorteio  
**Quando** aciono "Não"  
**Então** o sistema tira o serviço dos meus streamings  
**E**, se o título não estiver em nenhum outro streaming meu, troca a indicação na hora

### C4: Resumo sempre visível

**Dado** que estou na tela inicial ou na tela do título  
**Então** vejo "Todos os streamings · escolher os meus" ou "Netflix, Max · alterar"  
**Quando** aciono o link  
**Então** o sistema abre os filtros

### C5: Onde fica salvo

**Dado** que respondi "Não" ou alterei a lista  
**Então** a lista fica no navegador, para visitante, ou na conta, com a conta aberta  
**E** nada disso aparece na URL nem no console

## Regras de negócio específicas

- **RNE001 – Sim não restringe.** Só "Não" tira um serviço do sorteio. Se o primeiro "Sim" salvasse a lista, o sorteio ficaria só naquele serviço, sem a pessoa ter recusado os outros.
- **RNE002 – Respostas.** O que já foi respondido fica no localStorage, inclusive com conta. Em outro aparelho, a pergunta pode voltar uma vez.
- **RNE003 – Lista nunca vazia por "Não".** Com um único serviço na lista, não há pergunta, porque a lista vazia voltaria a significar todos. Serviço fora de uma lista já escolhida conta como respondido.
- **RNE004 – Vários serviços.** Pergunta-se sobre um serviço por vez, na ordem de RNG002.
- **RNE005 – Troca.** A troca segue "Outra opção" da origem atual (US004). Título fora das recomendações não troca.

## Segurança

- Nenhuma ação de servidor nova: com conta, vale `saveStreamings`, com schema estrito e sessão verificada.
- A chave `kinne:streaming-answers` só é lida com os valores de RNG002, guarda apenas ids de serviço e é apagada ao entrar e ao sair da conta. Sessão expirada em outro aparelho é risco aceito (security.md §17).
