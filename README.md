# Kinne

Chega de rolar catálogo: o Kinne indica um filme ou série por vez, só entre o que está nos streamings que você assina no Brasil. Indicações do dia, filtros rápidos e sorteio, com dados do TMDB.

## Stack

- Next.js (App Router), React e TypeScript (strict)
- Tailwind CSS
- ESLint e Vitest
- Postgres no Neon com Drizzle ORM (em breve)
- Hospedagem na Vercel; atualização diária do catálogo no GitHub Actions

## Como rodar localmente

Requer Node 24 (veja `.nvmrc`).

```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

Abra http://localhost:3000.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npm run format` | Formata o código com Prettier |
| `npm run format:check` | Confere a formatação sem alterar arquivos |
| `npm run typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `npm test` | Testes com Vitest |

## Atribuição

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.

## Licença

Todos os direitos reservados.
