// Roda as instruções da sala (src/infrastructure/db/group-room-sql.ts) contra um Postgres de
// verdade: fases, quem pode o quê, votos e o que o estado revela (group-room A2, A3, B1, B4, C4).
// Uso: aplique as migrations 0000 a 0010 num banco DESCARTÁVEL e rode
//   PGHOST=... PGPORT=... PGUSER=... PGDATABASE=... npx tsx scripts/test-group-room-repo.ts
// Nunca aponte para o banco de develop ou de produção: o script cria e apaga salas e títulos.
import { execFileSync } from "node:child_process";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { titleReferenced } from "@/infrastructure/db/catalog-repository";
import { catalogTitles } from "@/infrastructure/db/schema";
import * as q from "@/infrastructure/db/group-room-sql";

const dialect = new PgDialect();

function literal(value: unknown): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return `'${String(value).replaceAll("'", "''")}'`;
}

/** Roda a instrução como o kinne_app (as permissões também são testadas) e devolve as linhas. */
function run<T = Record<string, unknown>>(statement: SQL, role = "kinne_app"): T[] {
    const { sql, params } = dialect.sqlToQuery(statement);
    const text = sql.replace(/\$(\d+)/g, (_, n) => literal(params[Number(n) - 1]));
    const out = execFileSync(
        "psql",
        ["-v", "ON_ERROR_STOP=1", "-qAt", "-c", `set role ${role}; ${text}`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    // psql imprime "SET" para o set role e depois as linhas, uma por linha; um NULL é uma linha vazia
    const lines = out.split("\n");
    lines.pop();
    return lines
        .filter((l) => l !== "SET")
        .map((l) => (l.startsWith("{") ? JSON.parse(l) : { value: l }));
}

function admin(text: string): string {
    return execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-qAt", "-c", text], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
}

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
    if (!ok) {
        failures++;
        console.error(`FALHOU: ${name}`, detail ?? "");
    } else {
        console.log(`ok  ${name}`);
    }
}

const hash = (n: string) => n.padEnd(64, "0");
const none = { streamings: [], genres: [], watched: [], liked: [], willWatch: [], disliked: [] };
const TITLES = [9001, 9002, 9003, 9004, 9005, 9006, 9007];

function setup() {
    admin("delete from group_rooms where creator_key_hash like 'repotest-%'");
    for (const id of TITLES) {
        admin(`insert into catalog_titles (id, tmdb_id, title_type, slug, display_title, original_title,
            tmdb_average_rating, tmdb_vote_count, last_synced_at, is_recommendable)
            values (${id}, ${id}, 'movie', 'repotest-${id}', 'Título ${id}', 'Title ${id}', 7.5, 1000, now(), true)
            on conflict (id) do nothing`);
    }
}

function newRoom(code: string, key: string, creator: string, others: string[]) {
    const [created] = run<{ value: string }>(
        q.createRoom({
            code,
            creatorKey: `repotest-${key}`,
            tokenHash: hash(creator),
            member: none,
        }),
    );
    for (const o of others) run(q.joinRoom({ code, tokenHash: hash(o), member: none }));
    return Number(created.value);
}

const ready = (token: string, on = true) =>
    run(
        q.updatePreferences({
            tokenHash: hash(token),
            streamings: ["netflix"],
            genres: [],
            ready: on,
        }),
    );
const state = (token: string) =>
    run<{ state?: never }>(q.snapshot(hash(token)))[0] as unknown as
        | {
              room: { phase: string; round: number; expiresAt: string };
              members: { id: number; voted: boolean }[];
              finalists: { titleId: number; approvals: number | null; mine: boolean | null }[];
          }
        | undefined;
const finalistRows = { titleIds: [9001, 9002, 9003, 9004], scores: [0.9, 0.8, null, 0.5] };

try {
    setup();
    const room = newRoom("BBBBBBB2", "a", "creator", ["bia", "caio"]);
    void room;

    console.log("# saguão");
    check("estado de quem não está na sala é nulo", run(q.snapshot(hash("ninguem"))).length === 0);
    check("preferências no saguão passam", ready("bia").length === 1);
    check(
        "só quem criou muda tipo e duração (A3)",
        run(q.updateSettings({ tokenHash: hash("bia"), typeChoice: "movie", maxRuntime: 105 }))
            .length === 0 &&
            run(
                q.updateSettings({
                    tokenHash: hash("creator"),
                    typeChoice: "movie",
                    maxRuntime: 105,
                }),
            ).length === 1,
    );
    check(
        "duração fora da lista é recusada pelo banco",
        (() => {
            try {
                run(
                    q.updateSettings({
                        tokenHash: hash("creator"),
                        typeChoice: "movie",
                        maxRuntime: 100,
                    }),
                );
                return false;
            } catch {
                return true;
            }
        })(),
    );

    check(
        "o estado do saguão traz o código, para mostrar o QR",
        (state("creator") as unknown as { room: { code: string | null } }).room.code === "BBBBBBB2",
    );
    check(
        "o estado lista os streamings marcados por alguém, sem dizer por quem",
        JSON.stringify((state("creator") as unknown as { marked: string[] }).marked) ===
            '["netflix"]',
    );

    console.log("# começar");
    check(
        "só quem criou começa (A3)",
        run(q.startVoting({ tokenHash: hash("bia"), ...finalistRows })).length === 0,
    );
    check(
        "com uma pessoa pronta, não começa (C6)",
        run(q.startVoting({ tokenHash: hash("creator"), ...finalistRows })).length === 0,
    );
    ready("creator");
    const started = run(q.startVoting({ tokenHash: hash("creator"), ...finalistRows }));
    check("com duas prontas, começa", started.length === 1, started);
    check(
        "começar de novo é recusado (B4)",
        run(q.startVoting({ tokenHash: hash("creator"), ...finalistRows })).length === 0,
    );
    check("preferências depois de começar são recusadas (B4)", ready("caio").length === 0);
    check(
        "ninguém entra depois de começar (A4)",
        run(q.joinRoom({ code: "BBBBBBB2", tokenHash: hash("novo"), member: none }))[0].value ===
            "",
    );
    check(
        "gravou os finalistas com posição e pontuação",
        admin(
            "select string_agg(position || ':' || coalesce(group_score::text, 'n'), ',' order by position) from group_room_finalists where round = 1 and room_id = (select id from group_rooms where code = 'BBBBBBB2')",
        ) === "1:0.9,2:0.8,3:n,4:0.5",
    );

    check(
        "depois de começar, o código some do estado",
        (state("creator") as unknown as { room: { code: string | null } }).room.code === null ||
            (state("creator") as unknown as { room: { code?: string } }).room.code === undefined,
    );

    console.log("# votar");
    check(
        "voto em título que não é finalista é recusado (B1)",
        run(q.castVote({ tokenHash: hash("bia"), approved: [9001, 9006] })).length === 0,
    );
    check(
        "voto de quem não está na sala é recusado",
        run(q.castVote({ tokenHash: hash("fantasma"), approved: [9001] })).length === 0,
    );
    check(
        "voto válido grava uma linha por finalista",
        run(q.castVote({ tokenHash: hash("bia"), approved: [9001, 9003] })).length === 4,
    );
    check(
        "votar de novo troca a cédula, não soma (B1)",
        (() => {
            run(q.castVote({ tokenHash: hash("bia"), approved: [9002] }));
            return (
                admin(
                    "select count(*) || ':' || count(*) filter (where approved) from group_room_votes where member_id = (select id from group_room_members where token_hash = '" +
                        hash("bia") +
                        "')",
                ) === "4:1"
            );
        })(),
    );
    check(
        "voto sem marcar nada também conta como votou",
        run(q.castVote({ tokenHash: hash("caio"), approved: [] })).length === 4,
    );

    const duringVoting = state("creator")!;
    check(
        "durante a votação o estado não traz totais (C4)",
        duringVoting.finalists.every((f) => f.approvals === null),
    );
    check(
        "o estado mostra quem votou, sem em quem (C4)",
        duringVoting.members.filter((m) => m.voted).length === 2 &&
            !JSON.stringify(duringVoting).includes("member_id"),
    );
    check(
        "cada pessoa vê só o próprio voto",
        state("bia")!.finalists.filter((f) => f.mine === true).length === 1 &&
            state("creator")!.finalists.every((f) => f.mine === null),
    );
    check(
        "nem todos votaram: não fecha sozinha",
        run(q.closeIfEveryoneVoted(hash("bia"))).length === 0,
    );
    check("só quem criou encerra a votação (A3)", run(q.closeVoting(hash("bia"))).length === 0);
    run(q.castVote({ tokenHash: hash("creator"), approved: [9002, 9004] }));
    check("todos votaram: fecha", run(q.closeIfEveryoneVoted(hash("caio"))).length === 1);
    check("fechar de novo é recusado (B4)", run(q.closeIfEveryoneVoted(hash("caio"))).length === 0);

    console.log("# resultado");
    const result = state("caio")!;
    check("fase de resultado", result.room.phase === "result");
    check(
        "o resultado traz os totais por finalista",
        result.finalists.find((f) => f.titleId === 9002)?.approvals === 2 &&
            result.finalists.find((f) => f.titleId === 9001)?.approvals === 0,
    );
    check(
        "a sala expira em 30 minutos",
        (() => {
            const minutes = (new Date(result.room.expiresAt).getTime() - Date.now()) / 60000;
            return minutes > 28 && minutes <= 30.1;
        })(),
    );
    check(
        "voto depois do resultado é recusado (B4)",
        run(q.castVote({ tokenHash: hash("bia"), approved: [9001] })).length === 0,
    );
    check(
        "só quem criou pede outra rodada (A3)",
        run(
            q.nextRound({
                tokenHash: hash("bia"),
                titleIds: [9005, 9006, 9001],
                scores: [null, null, null],
            }),
        ).length === 0,
    );

    console.log("# outra rodada");
    check(
        "quem criou pede outra rodada",
        run(
            q.nextRound({
                tokenHash: hash("creator"),
                titleIds: [9005, 9006, 9001],
                scores: [null, null, null],
            }),
        ).length === 1,
    );
    const second = state("bia")!;
    check(
        "rodada 2 em votação, com os novos finalistas, sem votos antigos",
        second.room.round === 2 &&
            second.room.phase === "voting" &&
            second.finalists.length === 3 &&
            second.members.every((m) => !m.voted),
    );
    check(
        "a sala volta ao prazo de 3 horas",
        (new Date(second.room.expiresAt).getTime() - Date.now()) / 3_600_000 > 2.9,
    );
    check(
        "o finalista da rodada anterior não é mais votável",
        run(q.castVote({ tokenHash: hash("bia"), approved: [9002] })).length === 0,
    );
    check(
        "a rodada 2 só aceita seus finalistas",
        run(q.castVote({ tokenHash: hash("bia"), approved: [9005] })).length === 3,
    );
    run(q.closeVoting(hash("creator")));
    run(
        q.nextRound({
            tokenHash: hash("creator"),
            titleIds: [9002, 9003, 9004],
            scores: [null, null, null],
        }),
    );
    run(q.closeVoting(hash("creator")));
    check(
        "depois da 3ª rodada, não há quarta (RNE008)",
        run(
            q.nextRound({
                tokenHash: hash("creator"),
                titleIds: [9001, 9005, 9006],
                scores: [null, null, null],
            }),
        ).length === 0 && state("creator")!.room.round === 3,
    );

    console.log("# a carga do catálogo (titleReferenced, como kinne_sync)");
    {
        const { sql: text } = drizzle(neon("postgres://u:p@h/d"))
            .select({ id: catalogTitles.id, referenced: titleReferenced })
            .from(catalogTitles)
            .toSQL();
        const referenced = execFileSync(
            "psql",
            [
                "-v",
                "ON_ERROR_STOP=1",
                "-qAt",
                "-F",
                ",",
                "-c",
                `set role kinne_sync; select * from (${text}) t where id between 9001 and 9007 order by id`,
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        )
            .split("\n")
            .filter((l) => /^\d/.test(l))
            .map((l) => l.split(","));
        const flag = (id: number) => referenced.find((r) => Number(r[0]) === id)?.[1];
        check(
            "o título que é finalista de uma sala viva conta como referenciado",
            flag(9001) === "t",
            referenced,
        );
        check("o título que ninguém referencia continua apagável", flag(9007) === "f", referenced);
    }

    console.log("# sala vencida e saída");
    const old = newRoom("CCCCCCC3", "b", "oldc", ["oldd"]);
    admin(
        `update group_rooms set created_at = now() - interval '4 hours', expires_at = now() - interval '1 hour' where id = ${old}`,
    );
    check(
        "sala vencida recusa preferências, começo e voto",
        ready("oldd").length === 0 &&
            run(q.startVoting({ tokenHash: hash("oldc"), ...finalistRows })).length === 0,
    );
    check(
        "entrar numa sala vencida dá o mesmo erro",
        run(q.joinRoom({ code: "CCCCCCC3", tokenHash: hash("x"), member: none }))[0].value === "",
    );
    check(
        "a purga apaga a sala vencida e tudo o que ela guardava",
        (() => {
            run(q.purgeRooms());
            return admin(`select count(*) from group_room_members where room_id = ${old}`) === "0";
        })(),
    );
    check(
        "quem sai deixa de ver a sala",
        (() => {
            run(q.leaveRoom(hash("bia")));
            return (
                run(q.snapshot(hash("bia"))).length === 0 && state("creator")!.members.length === 2
            );
        })(),
    );
} finally {
    admin("delete from group_rooms where creator_key_hash like 'repotest-%'");
    admin("delete from group_room_finalists where catalog_title_id between 9001 and 9007");
    admin("delete from catalog_titles where id between 9001 and 9007");
}

if (failures > 0) {
    console.error(`${failures} verificação(ões) falharam`);
    process.exit(1);
}
console.log("OK");
