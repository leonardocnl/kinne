# 02 – Requisitos não funcionais

Kinne · Requisitos da semana 0 · versão de 10/10/2026

O Kinne roda nos três motores de navegador, cumpre a WCAG 2.2 nível AA mais seis critérios AAA, cabe nos planos gratuitos do Neon e da Vercel, não depende de recursos exclusivos da hospedagem e não guarda dado que identifique a pessoa.

## Compatibilidade

### RNF01 – Navegadores

O sistema funciona nos motores Blink (Chrome, Edge, Arc), Gecko (Firefox, Zen) e WebKit (Safari e qualquer navegador no iPhone), nas duas últimas versões, no computador e no celular.

**Critério:** antes de 26/10/2026, o fluxo completo passa no Safari do iPhone, num navegador Blink e num Gecko. Onde o efeito de vidro não funcionar, o painel usa fundo escuro sólido, sem quebrar.

### RNF02 – Largura mínima

O sistema funciona a partir de 360px de largura.

**Critério:** não há rolagem lateral entre 360px e 1440px.

## Acessibilidade

### RNF03 – WCAG 2.2 nível AA

O sistema cumpre todos os critérios do nível AA.

**Critério:** todo o fluxo funciona só com teclado; todo controle tem nome para leitor de tela; a rotação de capas tem botão visível de pausa; nenhum elemento fixo esconde o elemento em foco (2.4.11).

### RNF04 – Critérios AAA adotados

Contraste de 7:1, alvo de toque de 44px, aparência do foco, animações desligáveis, apresentação do texto e finalidade do link pelo próprio texto.

**Critério:** o texto secundário usa no mínimo 64% de branco sobre o fundo; nenhum alvo tocável mede menos de 44px; blocos de texto corrido têm no máximo 80 caracteres por linha.

### RNF05 – Critérios AAA não atendidos

"Sem limite de tempo", por causa da rotação automática de capas, e "nível de leitura", porque sinopses e frases vêm do TMDB.

**Critério:** apenas registro; não há teste.

## Desempenho e custo

### RNF06 – Banco em 0,25 CU

O banco no Neon roda travado em 0,25 CU, sem crescimento automático, para não esgotar as 100 CU-horas mensais do plano gratuito.

**Critério:** a configuração do Neon mostra mínimo e máximo em 0,25 CU.

### RNF07 – Cópia diária da tela inicial

A tela inicial é servida de uma cópia gerada uma vez por dia, sem consultar o banco a cada visita.

**Critério:** abrir a tela inicial não liga o banco quando a cópia do dia já existe.

### RNF08 – Imagens pelo TMDB

As imagens são servidas pelo TMDB, nunca pelo banco nem pela otimização de imagens da hospedagem.

**Critério:** o banco guarda apenas o caminho de cada imagem.

### RNF11 – Hospedagem portável

O sistema é hospedado na Vercel, no plano gratuito (Hobby), permitido por ser projeto de portfólio sem fins comerciais. O código não usa recursos exclusivos da Vercel, para que a mudança para outra hospedagem, como Cloudflare Workers, seja simples. Decisão de 10/10/2026.

**Critério:** o código não usa Vercel KV, Vercel Postgres, Vercel Blob nem Vercel Cron; o banco é acessado pelo driver HTTP do Neon; a atualização diária roda no GitHub Actions; chaves e senhas ficam em variáveis de ambiente.

## Privacidade

### RNF09 – Sem identificação pessoal

O banco não guarda nome, e-mail nem IP. O único identificador é o código aleatório do navegador, tratado como dado pseudonimizado.

**Critério:** a tabela de eventos não tem coluna de IP; o IP registrado pela hospedagem não é copiado para o banco.

### RNF10 – Apagamento dos eventos do teste

Os eventos do teste são apagados até 15/11/2026, logo após a análise. Nova coleta só ocorre depois do texto de privacidade completo.

**Critério:** em 16/11/2026 a tabela de eventos está vazia.
