# US014 – Perfil e meus dados

Kinne · Requisitos do pós-MVP · aprovada em 23/10/2026

|                |                                                    |
| -------------- | -------------------------------------------------- |
| **Telas**      | Perfil, Privacidade                                |
| **Depende de** | US012, US013, US015, `docs/security.md` §12 (LGPD) |
| **Ameaças**    | `docs/threats/accounts.md`                         |

## Descrição

Eu, como pessoa com conta, quero ver e corrigir o que o Kinne sabe de mim, e poder levar ou apagar meus dados, para que eu tenha controle sobre o meu perfil.

## Critérios de aceitação

### C1: Abrir o perfil

**Dado** que estou com a conta aberta  
**Quando** aciono o ícone de perfil na barra do topo (no lugar de "Entrar")  
**Então** o sistema mostra o perfil com as seções:

| Seção             | Conteúdo                                                    | Ações                                     |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------- |
| Conta             | O e-mail                                                    | Nenhuma (só exibição)                     |
| Onde você assiste | Os streamings marcados                                      | Marcar e desmarcar                        |
| Seu gosto         | Os títulos de "Curti" e de "Não curti", com cartaz e título | Tirar um título da lista                  |
| Já vi             | Os títulos marcados como "Já vi"                            | Tirar um título da lista                  |
| Seus dados        | —                                                           | "Baixar meus dados", "Apagar minha conta" |
| Sessão            | —                                                           | "Sair", "Sair de todos os aparelhos"      |

**E**, se algum passo do onboarding foi pulado, o aviso "Complete seu gosto" com a ação que leva a ele (US013 C4)

### C2: Mudar o que o Kinne sabe

**Dado** que estou no perfil  
**Quando** tiro um título de "Curti", "Não curti" ou "Já vi", ou mudo um streaming  
**Então** a mudança vale na hora, para as próximas indicações em qualquer aparelho

### C3: Sair de todos os aparelhos

**Dado** que estou no perfil  
**Quando** aciono "Sair de todos os aparelhos" e confirmo  
**Então** o sistema encerra todas as sessões da conta, inclusive esta (US012 C7)

### C4: Baixar meus dados

**Dado** que estou no perfil  
**Quando** aciono "Baixar meus dados"  
**Então** o navegador baixa um arquivo `kinne-meus-dados.json` com o e-mail, a data de criação da conta, os streamings, os sinais de gosto (com a data de cada um), o "Já vi" e o progresso do onboarding  
**E** o arquivo não traz ids internos de sessão, hashes nem dados de outras pessoas

### C5: Apagar minha conta

**Dado** que estou no perfil  
**Quando** aciono "Apagar minha conta"  
**Então** o sistema explica o que será apagado e pede um código novo no e-mail (US012 RNE002) para confirmar (RNE001)  
**Quando** digito o código certo  
**Então** o sistema apaga a conta e tudo que é dela, encerra todas as sessões, limpa o navegador (US015 RNE004) e volta à tela inicial com "Sua conta foi apagada."

### C6: Texto de privacidade

**Dado** que estou em qualquer tela  
**Quando** aciono "Privacidade" no rodapé, ou o link na tela de entrar (US012 C1)  
**Então** o sistema mostra o texto de privacidade: que dados guarda (e-mail, streamings, gosto, "Já vi", progresso do onboarding), para quê, por quanto tempo, quem os processa (Neon, Vercel, Resend), como baixar e apagar, e um contato

## Regras de negócio específicas

- **RNE001 – Apagar pede código novo.** Uma sessão roubada não basta para apagar a conta: é preciso acesso ao e-mail naquele momento.
- **RNE002 – O que "apagar" apaga.** A linha da conta, sessões, códigos pendentes, streamings, sinais, "Já vi" e progresso do onboarding, numa transação. Os eventos de uso não são apagados porque nunca foram ligados à conta (US012 RNE008).
- **RNE003 – Texto de privacidade é rascunho.** O texto da C6 é escrito como rascunho para revisão do dono do projeto antes de as contas irem ao ar (`docs/security.md` §12).
