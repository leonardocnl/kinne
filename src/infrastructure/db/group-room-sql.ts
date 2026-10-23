import { sql, type SQL } from "drizzle-orm";

// As instruções da sala de grupo (US011). Cada mudança de fase é uma instrução só que confere a
// fase e quem pede no próprio WHERE (comparar e trocar, group-room B4): o driver HTTP do Neon não
// tem transação interativa, e uma escrita fora da fase certa simplesmente não acontece. Quem pede
// é sempre achado pelo hash do cookie, nunca por um id vindo do corpo (A2); as ações de quem criou
// conferem `creator_member_id` aqui no banco (A3). scripts/test-group-room-repo.ts roda estas
// instruções contra um Postgres de verdade.

const list = <T>(items: readonly T[], cast: string): SQL =>
    items.length > 0
        ? sql`array[${sql.join(
              items.map((i) => sql`${i}`),
              sql`, `,
          )}]::${sql.raw(cast)}`
        : sql`'{}'::${sql.raw(cast)}`;

const ints = (items: readonly number[]) => list(items, "integer[]");
const texts = (items: readonly string[]) => list(items, "text[]");
// Cada pontuação leva o próprio cast: um grupo sem nenhum sinal de gosto não tem pontuação (nula).
const scoreList = (items: readonly (number | null)[]) =>
    items.length > 0
        ? sql`array[${sql.join(
              items.map((i) => sql`${i}::real`),
              sql`, `,
          )}]::real[]`
        : sql`'{}'::real[]`;

/** O que a pessoa leva ao entrar (RNE009): preferências, "Já vi" e sinais de gosto. */
export type MemberDetails = {
    streamings: readonly string[];
    genres: readonly string[];
    watched: readonly number[];
    liked: readonly number[];
    willWatch: readonly number[];
    disliked: readonly number[];
};

const details = (m: MemberDetails) =>
    sql`${texts(m.streamings)}, ${texts(m.genres)}, ${ints(m.watched)}, ${ints(m.liked)}, ${ints(m.willWatch)}, ${ints(m.disliked)}`;

// --- funções (migration 0010) --------------------------------------------------------------

export const createRoom = (p: {
    code: string;
    creatorKey: string;
    tokenHash: string;
    member: MemberDetails;
}) =>
    sql`select kinne_create_group_room(${p.code}, ${p.creatorKey}, ${p.tokenHash}, ${details(p.member)}) as result`;

export const joinRoom = (p: { code: string; tokenHash: string; member: MemberDetails }) =>
    sql`select kinne_join_group_room(${p.code}, ${p.tokenHash}, ${details(p.member)}) as result`;

export const leaveRoom = (tokenHash: string) =>
    sql`select kinne_leave_group_room(${tokenHash}) as result`;

export const purgeRooms = () => sql`select kinne_purge_group_rooms() as result`;

// --- leitura: o estado da sala para quem pergunta (uma leitura só, por índice) ---------------

/**
 * Tudo o que a tela da pessoa precisa, num JSON só. Os votos de cada pessoa nunca saem daqui, só
 * o que cada um já votou (sim ou não) e o próprio voto de quem pergunta; os totais por finalista
 * só existem depois do resultado (C4).
 */
export const snapshot = (tokenHash: string) => sql`
select jsonb_build_object(
    'room', jsonb_build_object(
        'id', r.id, 'phase', r.phase, 'round', r.round, 'typeChoice', r.type_choice,
        'maxRuntime', r.max_runtime_minutes, 'expiresAt', r.expires_at,
        'resultAt', r.result_at, 'creatorMemberId', r.creator_member_id),
    'me', jsonb_build_object(
        'id', me.id, 'position', me.position, 'ready', me.ready,
        'streamings', me.streamings, 'genres', me.genres),
    'members', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'id', m.id, 'position', m.position, 'ready', m.ready,
            'voted', exists (
                select 1 from group_room_votes v
                where v.room_id = r.id and v.round = r.round and v.member_id = m.id)
        ) order by m.position), '[]'::jsonb)
        from group_room_members m where m.room_id = r.id and m.left_at is null),
    'finalists', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'titleId', f.catalog_title_id, 'position', f.position,
            'slug', t.slug, 'title', t.display_title, 'year', t.release_year,
            'poster', t.poster_image_path,
            'streamingTmdbIds', (
                select coalesce(jsonb_agg(s.tmdb_id), '[]'::jsonb)
                from streaming_availability a
                join streaming_services s on s.id = a.streaming_service_id
                where a.catalog_title_id = t.id and a.country_code = 'BR'),
            'approvals', case when r.phase = 'result' then (
                select count(*) from group_room_votes v
                join group_room_members vm on vm.id = v.member_id and vm.left_at is null
                where v.room_id = f.room_id and v.round = f.round
                    and v.catalog_title_id = f.catalog_title_id and v.approved) end,
            'mine', (
                select v.approved from group_room_votes v
                where v.room_id = f.room_id and v.round = f.round
                    and v.member_id = me.id and v.catalog_title_id = f.catalog_title_id)
        ) order by f.position), '[]'::jsonb)
        from group_room_finalists f
        join catalog_titles t on t.id = f.catalog_title_id
        where f.room_id = r.id and f.round = r.round)
) as state
from group_room_members me
join group_rooms r on r.id = me.room_id
where me.token_hash = ${tokenHash} and me.left_at is null`;

/**
 * O que quem criou precisa para propor finalistas: a sala, as pessoas com preferências, "Já vi" e
 * gosto, e os finalistas de todas as rodadas (para não repetir). Só devolve algo a quem criou (A3).
 */
export const proposalInput = (tokenHash: string) => sql`
select jsonb_build_object(
    'room', jsonb_build_object(
        'id', r.id, 'phase', r.phase, 'round', r.round, 'typeChoice', r.type_choice,
        'maxRuntime', r.max_runtime_minutes),
    'members', (
        select coalesce(jsonb_agg(jsonb_build_object(
            'id', m.id, 'ready', m.ready, 'streamings', m.streamings, 'genres', m.genres,
            'watched', m.watched_ids, 'liked', m.liked_ids,
            'willWatch', m.will_watch_ids, 'disliked', m.disliked_ids
        ) order by m.position), '[]'::jsonb)
        from group_room_members m where m.room_id = r.id and m.left_at is null),
    'previous', (
        select coalesce(jsonb_agg(f.catalog_title_id), '[]'::jsonb)
        from group_room_finalists f where f.room_id = r.id)
) as input
from group_room_members me
join group_rooms r on r.id = me.room_id and r.creator_member_id = me.id
where me.token_hash = ${tokenHash} and me.left_at is null and r.expires_at > now()`;

/** Os totais de cada finalista da rodada, para o vencedor (RNE006). Só quem está na sala. */
export const tallies = (tokenHash: string) => sql`
select f.catalog_title_id as "titleId", f.group_score as "groupScore",
    t.tmdb_average_rating::float8 as rating, t.tmdb_vote_count as votes,
    (select count(*) from group_room_votes v
        join group_room_members vm on vm.id = v.member_id and vm.left_at is null
        where v.room_id = f.room_id and v.round = f.round
            and v.catalog_title_id = f.catalog_title_id and v.approved)::int as approvals
from group_room_members me
join group_rooms r on r.id = me.room_id
join group_room_finalists f on f.room_id = r.id and f.round = r.round
join catalog_titles t on t.id = f.catalog_title_id
where me.token_hash = ${tokenHash} and me.left_at is null
order by f.position`;

// --- escrita: comparar e trocar --------------------------------------------------------------

/** Preferências e "Pronto" da própria pessoa, só no saguão (C5). */
export const updatePreferences = (p: {
    tokenHash: string;
    streamings: readonly string[];
    genres: readonly string[];
    ready: boolean;
}) => sql`
update group_room_members m
set streamings = ${texts(p.streamings)}, genres = ${texts(p.genres)}, ready = ${p.ready}
from group_rooms r
where m.token_hash = ${p.tokenHash} and m.left_at is null
    and r.id = m.room_id and r.phase = 'lobby' and r.expires_at > now()
returning m.id`;

/** Tipo e duração são de quem criou, só no saguão (C5). */
export const updateSettings = (p: {
    tokenHash: string;
    typeChoice: string;
    maxRuntime: number | null;
}) => sql`
update group_rooms r
set type_choice = ${p.typeChoice}, max_runtime_minutes = ${p.maxRuntime}
from group_room_members m
where m.token_hash = ${p.tokenHash} and m.left_at is null
    and m.room_id = r.id and r.creator_member_id = m.id
    and r.phase = 'lobby' and r.expires_at > now()
returning r.id`;

export type FinalistRows = {
    titleIds: readonly number[];
    scores: readonly (number | null)[];
};

/**
 * "Ver as opções" (C6): só quem criou, no saguão, com duas pessoas prontas. Devolve a sala se
 * começou. Os finalistas já vêm calculados pelo servidor.
 */
export const startVoting = (p: { tokenHash: string } & FinalistRows) => sql`
with moved as (
    update group_rooms r
    set phase = 'voting'
    from group_room_members m
    where m.token_hash = ${p.tokenHash} and m.left_at is null
        and m.room_id = r.id and r.creator_member_id = m.id
        and r.phase = 'lobby' and r.expires_at > now()
        and (select count(*) from group_room_members p
            where p.room_id = r.id and p.left_at is null and p.ready) >= 2
    returning r.id, r.round
), inserted as (
    insert into group_room_finalists (room_id, round, catalog_title_id, position, group_score)
    select moved.id, moved.round, f.title_id, f.position::smallint, f.score
    from moved
    cross join unnest(${ints(p.titleIds)}, ${ints(p.titleIds.map((_, i) => i + 1))}, ${scoreList(p.scores)}) as f(title_id, position, score)
    returning 1
)
select id from moved`;

/** "Outra rodada" (C9): só quem criou, depois do resultado, até a 3ª rodada. */
export const nextRound = (p: { tokenHash: string } & FinalistRows) => sql`
with moved as (
    update group_rooms r
    set phase = 'voting', round = r.round + 1, result_at = null,
        expires_at = r.created_at + interval '3 hours'
    from group_room_members m
    where m.token_hash = ${p.tokenHash} and m.left_at is null
        and m.room_id = r.id and r.creator_member_id = m.id
        and r.phase = 'result' and r.round < 3 and r.expires_at > now()
    returning r.id, r.round
), inserted as (
    insert into group_room_finalists (room_id, round, catalog_title_id, position, group_score)
    select moved.id, moved.round, f.title_id, f.position::smallint, f.score
    from moved
    cross join unnest(${ints(p.titleIds)}, ${ints(p.titleIds.map((_, i) => i + 1))}, ${scoreList(p.scores)}) as f(title_id, position, score)
    returning 1
)
select id from moved`;

/**
 * "Votar" (C7): grava uma linha por finalista da rodada, sim ou não, trocando a cédula anterior
 * (B1). Recusa tudo se algum título votado não é finalista da rodada.
 */
export const castVote = (p: { tokenHash: string; approved: readonly number[] }) => sql`
insert into group_room_votes (room_id, round, member_id, catalog_title_id, approved)
select r.id, r.round, m.id, f.catalog_title_id, f.catalog_title_id = any(${ints(p.approved)})
from group_room_members m
join group_rooms r on r.id = m.room_id and r.phase = 'voting' and r.expires_at > now()
join group_room_finalists f on f.room_id = r.id and f.round = r.round
where m.token_hash = ${p.tokenHash} and m.left_at is null
    and ${ints(p.approved)} <@ (
        select array_agg(x.catalog_title_id) from group_room_finalists x
        where x.room_id = r.id and x.round = r.round)
on conflict (room_id, round, member_id, catalog_title_id)
do update set approved = excluded.approved
returning member_id`;

// O resultado: a sala passa a expirar 30 minutos depois, se isso vier antes das 3 horas (C10).
const toResult = sql`
set phase = 'result', result_at = now(),
    expires_at = greatest(r.created_at + interval '1 microsecond',
        least(r.created_at + interval '3 hours', now() + interval '30 minutes'))`;

/** "Encerrar votação" (C8): só quem criou, durante a votação. */
export const closeVoting = (tokenHash: string) => sql`
update group_rooms r ${toResult}
from group_room_members m
where m.token_hash = ${tokenHash} and m.left_at is null
    and m.room_id = r.id and r.creator_member_id = m.id
    and r.phase = 'voting' and r.expires_at > now()
returning r.id`;

/**
 * Todas as pessoas na sala votaram (C8): qualquer uma delas pode fechar. Duas ao mesmo tempo dão
 * o mesmo resultado, porque só uma troca a fase.
 */
export const closeIfEveryoneVoted = (tokenHash: string) => sql`
update group_rooms r ${toResult}
from group_room_members me
where me.token_hash = ${tokenHash} and me.left_at is null
    and me.room_id = r.id and r.phase = 'voting' and r.expires_at > now()
    and not exists (
        select 1 from group_room_members m
        where m.room_id = r.id and m.left_at is null
            and not exists (
                select 1 from group_room_votes v
                where v.room_id = r.id and v.round = r.round and v.member_id = m.id))
returning r.id`;
