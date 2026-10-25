# US012 – Entrar com código

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026

|                |                                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| **Telas**      | Entrar (e-mail), Entrar (código)                                                |
| **Eventos**    | Nenhum novo; os eventos de uso seguem anônimos e nunca ligados à conta (RNE008) |
| **Depende de** | US001 (botão "Entrar"), `docs/security.md` §12 e §13, RNG005                    |
| **Ameaças**    | `docs/threats/accounts.md`                                                      |
| **Leva a**     | US013 (Onboarding) no primeiro acesso; tela de onde a pessoa veio nos seguintes |

## Descrição

Eu, como visitante, quero entrar no Kinne só com o meu e-mail, sem senha, para que o meu gosto fique guardado e me acompanhe em qualquer aparelho.

## Critérios de aceitação

### C1: Pedir o código

**Dado** que estou em qualquer tela, sem conta aberta  
**Quando** aciono "Entrar" na barra do topo  
**Então** o sistema mostra a tela "Entrar no Kinne" com o campo:

| Campo  | Tipo   | Obg | Validações                                     | Exemplo           | Valor padrão |
| ------ | ------ | --- | ---------------------------------------------- | ----------------- | ------------ |
| E-mail | E-mail | Sim | Formato de e-mail; até 254 caracteres (RNE001) | "ana@exemplo.com" | Vazio        |

**E** a ação "Receber código" (principal)  
**E** o texto "Sem senha: mandamos um código de 6 dígitos para o seu e-mail."

### C2: Código enviado

**Dado** que digitei um e-mail válido  
**Quando** aciono "Receber código"  
**Então** o sistema mostra "Se este e-mail puder entrar, o código chega em instantes. Confira também o spam." e o campo do código  
**E** a resposta é a mesma, no mesmo tempo, exista ou não uma conta com esse e-mail (RNE003)

### C3: Digitar o código

**Dado** que pedi um código  
**Quando** a tela do código aparece  
**Então** o campo aceita 6 dígitos, com teclado numérico no celular e preenchimento automático do código do e-mail quando o sistema do aparelho oferecer (`autocomplete="one-time-code"`)  
**E** há "Reenviar código", ativo depois de 60 segundos, e "Usar outro e-mail"

### C4: Código certo

**Dado** que digitei o código certo, dentro da validade  
**Quando** confirmo  
**Então** o sistema abre a conta (criando-a, se for o primeiro acesso deste e-mail) e inicia a sessão (RNE005)  
**E** leva os sinais de gosto, o "Já vi" e os streamings do navegador para a conta (US015)  
**E** no primeiro acesso leva ao onboarding (US013); nos seguintes, volta à tela de onde vim

### C5: Código errado ou vencido

**Dado** que digitei um código errado ou vencido  
**Quando** confirmo  
**Então** o sistema mostra "Código inválido ou vencido." (a mesma mensagem nos dois casos)  
**E**, depois de 5 tentativas erradas, o código deixa de valer e a mensagem passa a ser "Peça um código novo." (RNE004)

### C6: Pedidos demais

**Dado** que pedi códigos demais em pouco tempo (RNE004)  
**Quando** peço outro  
**Então** o sistema mostra "Muitas tentativas. Tente de novo em alguns minutos."  
**E** não envia e-mail

### C7: Sair

**Dado** que estou com a conta aberta  
**Quando** aciono "Sair" (no perfil, US014)  
**Então** o sistema encerra a sessão no servidor e apaga o cookie  
**E** apaga do navegador os sinais de gosto, o "Já vi" e os streamings (US015 RNE004)  
**E** volta à tela inicial, como visitante

## Regras de negócio específicas

- **RNE001 – E-mail.** Guardado em minúsculas e sem espaços nas pontas; até 254 caracteres; validação de formato simples (algo@algo.algo). O e-mail é o único dado pessoal da conta: sem nome, telefone ou apelido.
- **RNE002 – Código.** 6 dígitos, gerado no servidor com gerador criptográfico, válido por 10 minutos, de uso único, guardado só como hash. Um código novo invalida o anterior do mesmo e-mail.
- **RNE003 – Sem enumeração.** Pedir código para um e-mail com ou sem conta dá a mesma resposta e o mesmo tempo de resposta (o envio é feito fora do caminho da resposta). A conta só é criada quando um código é confirmado.
- **RNE004 – Limites.** Por código: 5 tentativas. Por e-mail: 1 pedido a cada 60 s e no máximo 5 por hora. Por cliente (IP): limites com o token bucket existente (`kinne_take_tokens`), para pedidos e para tentativas. Os números finais ficam no modelo de ameaças.
- **RNE005 – Sessão.** 30 dias, renovados a cada uso, com teto de 90 dias desde o login. Cookie `__Host-kinne_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, com 32 bytes aleatórios; o banco guarda só o hash. Uma sessão nova a cada login; "Sair" apaga a sessão no servidor; "Sair de todos os aparelhos" apaga todas (US014).
- **RNE006 – Envio.** Pelo Resend, de um endereço do domínio do Kinne, com o texto "Seu código do Kinne: 482 913. Vale por 10 minutos. Se não foi você, ignore este e-mail." e nada além disso (sem link). Enquanto o domínio não existir, um envio de desenvolvimento escreve o código no terminal do servidor, e **só** fora de produção (ameaças E1).
- **RNE007 – Nada na URL.** E-mail, código e etapa do login nunca vão para a URL; a etapa fica no estado da tela.
- **RNE008 – Métricas anônimas.** Os eventos de uso (`anonymous_usage_events`) continuam ligados só ao código do navegador, nunca ao id da conta nem ao e-mail.
