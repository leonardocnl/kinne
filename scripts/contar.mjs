// Kinne · contagem do catálogo no TMDB (semana 0)
// Uso:  node --env-file=.env.local contar.mjs
// Precisa de Node 20.6 ou mais novo e do arquivo .env.local com:
//   TMDB_TOKEN=eyJ...   (o "API Read Access Token")
// O resultado sai na tela e no arquivo resultado.md, sem o token.

import { writeFileSync } from 'node:fs';

const TOKEN = process.env.TMDB_TOKEN;
if (!TOKEN || !TOKEN.startsWith('eyJ')) {
  console.error('Faltou o TMDB_TOKEN no .env.local (o token longo que começa com eyJ).');
  process.exit(1);
}

const REGIAO = 'BR';
const NOTA = 6.4;
const VOTOS = [300, 500, 1000];        // 500 é o ponto de partida; os outros mostram a sensibilidade
const AMOSTRA = 10;                     // títulos por gênero para conferir tagline e trailer
// Nomes como o TMDB costuma chamar os streamings no Brasil. Conferidos pelo próprio script.
const STREAMINGS = [
  { nome: 'Netflix', busca: [/^netflix$/i] },
  { nome: 'Max', busca: [/^max$/i, /^hbo max$/i] },
  { nome: 'Prime Video', busca: [/^amazon prime video$/i, /^prime video$/i] },
  { nome: 'Disney+', busca: [/^disney plus$/i, /^disney\+$/i] },
  { nome: 'Globoplay', busca: [/^globoplay$/i] },
];
// Gêneros do Kinne e os nomes que procuramos em cada lista do TMDB.
const GENEROS = {
  'Ação': { movie: [/^ação$/i], tv: [/^action & adventure$/i, /^ação & aventura$/i] },
  'Comédia': { movie: [/^comédia$/i], tv: [/^comédia$/i] },
  'Drama': { movie: [/^drama$/i], tv: [/^drama$/i] },
  'Romance': { movie: [/^romance$/i], tv: [/^romance$/i] },
  'Suspense': { movie: [/^thriller$/i, /^suspense$/i], tv: [/^thriller$/i, /^suspense$/i, /^mistério$/i] },
};

let chamadas = 0;
async function tmdb(caminho, params = {}) {
  const url = new URL('https://api.themoviedb.org/3' + caminho);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    chamadas++;
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN, accept: 'application/json' } });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * tentativa)); continue; }
    if (r.status === 401) { console.error('O TMDB recusou o token (401). Confira se copiou o "API Read Access Token".'); process.exit(1); }
    if (!r.ok) throw new Error(`TMDB respondeu ${r.status} em ${caminho}`);
    return r.json();
  }
  throw new Error('Limite de requisições do TMDB; tente de novo em um minuto.');
}

const acha = (lista, padroes, campo = 'name') => lista.find((x) => padroes.some((p) => p.test(x[campo] || '')));
const linhas = [];
const out = (s = '') => { console.log(s); linhas.push(s); };
const tabela = (cab, rows) => {
  out('| ' + cab.join(' | ') + ' |');
  out('|' + cab.map(() => ' --- ').join('|') + '|');
  rows.forEach((r) => out('| ' + r.join(' | ') + ' |'));
  out();
};

async function main() {
  out(`# Contagem do catálogo · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  out(`Região ${REGIAO}, só assinatura (flatrate), nota TMDB ≥ ${String(NOTA).replace('.', ',')}.`);
  out();

  // 1. Streamings: descobre os códigos no Brasil
  const provs = {};
  for (const tipo of ['movie', 'tv']) {
    const { results } = await tmdb(`/watch/providers/${tipo}`, { watch_region: REGIAO, language: 'pt-BR' });
    for (const s of STREAMINGS) {
      const p = acha(results, s.busca, 'provider_name');
      if (p) provs[s.nome] = p.provider_id;
    }
  }
  out('## Streamings encontrados');
  tabela(['Streaming', 'Código no TMDB'], STREAMINGS.map((s) => [s.nome, provs[s.nome] ?? '**não encontrado**']));
  const todos = Object.values(provs).join('|');

  // 2. Gêneros: descobre os códigos em português
  const gen = { movie: {}, tv: {} };
  for (const tipo of ['movie', 'tv']) {
    const { genres } = await tmdb(`/genre/${tipo}/list`, { language: 'pt-BR' });
    for (const [nome, busca] of Object.entries(GENEROS)) {
      const g = acha(genres, busca[tipo]);
      if (g) gen[tipo][nome] = g;
    }
    if (tipo === 'tv') out('Gêneros de série que o TMDB tem: ' + genres.map((g) => g.name).join(', ') + '.\n');
  }
  out('## Gêneros encontrados');
  tabela(['Gênero do Kinne', 'Filme (TMDB)', 'Série (TMDB)'], Object.keys(GENEROS).map((n) => [
    n, gen.movie[n] ? `${gen.movie[n].name} (${gen.movie[n].id})` : '**não existe**',
    gen.tv[n] ? `${gen.tv[n].name} (${gen.tv[n].id})` : '**não existe**',
  ]));

  const base = (tipo, votos, extra = {}) => ({
    watch_region: REGIAO, with_watch_monetization_types: 'flatrate', with_watch_providers: todos,
    'vote_average.gte': NOTA, 'vote_count.gte': votos, include_adult: false, language: 'pt-BR',
    sort_by: 'vote_average.desc', ...extra,
  });
  const conta = async (tipo, votos, extra) => (await tmdb(`/discover/${tipo}`, base(tipo, votos, extra))).total_results;

  // 3. Quantos títulos passam no piso, por gênero e por número mínimo de votos
  for (const tipo of ['movie', 'tv']) {
    out(`## ${tipo === 'movie' ? 'Filmes' : 'Séries'} que passam no piso, por gênero`);
    const rows = [];
    for (const nome of Object.keys(GENEROS)) {
      const g = gen[tipo][nome];
      if (!g) { rows.push([nome, ...VOTOS.map(() => '—')]); continue; }
      const nums = [];
      for (const v of VOTOS) nums.push(await conta(tipo, v, { with_genres: g.id }));
      rows.push([nome, ...nums]);
    }
    const totais = [];
    for (const v of VOTOS) totais.push(await conta(tipo, v));
    rows.push(['**Todos**', ...totais.map((n) => `**${n}**`)]);
    tabela(['Gênero', ...VOTOS.map((v) => `≥ ${v} votos`)], rows);
  }

  // 4. Por streaming (piso de 500 votos)
  out('## Por streaming (≥ 500 votos)');
  const rowsS = [];
  for (const s of STREAMINGS) {
    if (!provs[s.nome]) { rowsS.push([s.nome, '—', '—']); continue; }
    rowsS.push([s.nome,
      await conta('movie', 500, { with_watch_providers: provs[s.nome] }),
      await conta('tv', 500, { with_watch_providers: provs[s.nome] })]);
  }
  tabela(['Streaming', 'Filmes', 'Séries'], rowsS);

  // 5. Amostra: tagline em português e trailer, nos mais bem avaliados de cada gênero
  out(`## Amostra: os ${AMOSTRA} mais bem avaliados de cada gênero (≥ 500 votos)`);
  const rowsA = [];
  const exemplos = [];
  for (const tipo of ['movie', 'tv']) {
    for (const nome of Object.keys(GENEROS)) {
      const g = gen[tipo][nome];
      if (!g) continue;
      const { results } = await tmdb(`/discover/${tipo}`, base(tipo, 500, { with_genres: g.id }));
      let tag = 0, sinopse = 0, trailer = 0, trailerPt = 0;
      for (const t of results.slice(0, AMOSTRA)) {
        const d = await tmdb(`/${tipo}/${t.id}`, { language: 'pt-BR', append_to_response: 'videos', include_video_language: 'pt,en,null' });
        if (d.tagline && d.tagline.trim()) tag++;
        if (d.overview && d.overview.trim()) sinopse++;
        const yt = (d.videos?.results || []).filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
        if (yt.length) trailer++;
        if (yt.some((v) => v.iso_639_1 === 'pt')) trailerPt++;
        if (exemplos.length < 6 && d.tagline) exemplos.push(`- ${d.title || d.name}: "${d.tagline}"`);
      }
      const n = Math.min(AMOSTRA, results.length);
      rowsA.push([`${nome} (${tipo === 'movie' ? 'filme' : 'série'})`, n, tag, sinopse, trailer, trailerPt]);
    }
  }
  tabela(['Grupo', 'Títulos', 'Com tagline em pt-BR', 'Com sinopse em pt-BR', 'Com trailer', 'Com trailer em pt'], rowsA);
  out('Exemplos de tagline, para conferir se estão mesmo em português:');
  exemplos.forEach((e) => out(e));
  out();
  out(`Chamadas ao TMDB: ${chamadas}.`);

  writeFileSync(new URL('./resultado.md', import.meta.url), linhas.join('\n'));
  console.log('\nSalvo em resultado.md. Cole o conteúdo desse arquivo na conversa (ele não tem o token).');
}

main().catch((e) => { console.error('Deu erro:', e.message); process.exit(1); });
