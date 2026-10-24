import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Verificação estática da migration da sala (group-room A2, B4, C2, F1). O comportamento das
// funções, inclusive as saídas simultâneas, é testado contra um Postgres de verdade por
// scripts/test-group-room-sql.sh.
const sql = readFileSync(join(import.meta.dirname, "../../../drizzle/0010_group_room.sql"), "utf8");

describe("migration 0010 (sala de grupo)", () => {
    it("o kinne_app nunca recebe DELETE nem escreve direto em sala ou membro", () => {
        const grants = [...sql.matchAll(/GRANT ([^;]+?) TO kinne_app;/g)].map((m) => m[1]);
        expect(grants.length).toBeGreaterThan(0);
        for (const grant of grants) {
            expect(grant, grant).not.toMatch(/\bDELETE\b|\bALL\b|\bTRUNCATE\b/i);
        }
        const inserts = grants.filter((g) => /^INSERT /.test(g));
        expect(inserts.sort()).toEqual([
            "INSERT ON group_room_finalists",
            "INSERT ON group_room_votes",
        ]);
        // o cookie, o criador e os dados pessoais só mudam pelas funções
        const updates = grants.filter((g) => g.startsWith("UPDATE")).join(" ");
        expect(updates).not.toMatch(
            /token_hash|creator_member_id|watched_ids|liked_ids|disliked_ids/,
        );
    });

    it("as funções rodam com os direitos do dono, com search_path fixo e fechadas ao público", () => {
        const functions = [...sql.matchAll(/CREATE OR REPLACE FUNCTION (\w+)\(/g)].map((m) => m[1]);
        expect(functions.sort()).toEqual([
            "kinne_create_group_room",
            "kinne_join_group_room",
            "kinne_leave_group_room",
            "kinne_purge_group_rooms",
        ]);
        for (const name of functions) {
            const body = sql.slice(sql.indexOf(`FUNCTION ${name}(`));
            const header = body.slice(0, body.indexOf("$$"));
            expect(header, name).toContain("SECURITY DEFINER SET search_path = pg_catalog, public");
            expect(sql, name).toMatch(new RegExp(`REVOKE ALL ON FUNCTION ${name}\\\(`));
            expect(sql, name).toMatch(
                new RegExp(`GRANT EXECUTE ON FUNCTION ${name}\\\(.*TO kinne_app`),
            );
        }
    });

    it("sair e passar o papel de criador acontece sob o lock da sala (F1)", () => {
        const leave = sql.slice(sql.indexOf("FUNCTION kinne_leave_group_room"));
        expect(leave).toMatch(/FROM group_rooms WHERE id = v_room FOR UPDATE/);
        // quem sai perde o cookie e os dados pessoais na mesma instrução (F2)
        expect(leave).toMatch(/token_hash = NULL/);
        expect(leave).toMatch(/watched_ids = '\{\}'/);
        // a pessoa seguinte é a de menor ordem de entrada ainda na sala (C11)
        expect(leave).toMatch(/ORDER BY position LIMIT 1/);
    });

    it("o limite de 3 salas por hora e a entrada seguem as regras (D1, A4, RNE003)", () => {
        expect(sql).toMatch(/>= 3 THEN\s+RETURN NULL/);
        expect(sql).toContain("phase = 'lobby' AND expires_at > now()");
        expect(sql).toMatch(/left_at IS NULL\) >= 8/);
    });

    it("o código e a fase são fechados no banco", () => {
        expect(sql).toContain("'^[2-9A-HJKMNP-Z]{8}$'");
        expect(sql).toContain("in ('lobby', 'voting', 'result')");
    });
});
