import { describe, expect, it } from "vitest";
import type { FilterCandidate } from "./filters";
import {
    canStart,
    CODE_ALPHABET,
    CODE_LENGTH,
    everyoneVoted,
    formatCode,
    generateCode,
    MAX_FINALISTS,
    nextCreator,
    normalizeCode,
    pickFinalists,
    pickWinner,
    RESULT_TTL_MS,
    roomCandidates,
    roomExpired,
    roomExpiry,
    ROOM_TTL_MS,
    type MemberInput,
    type Seat,
} from "./group-room";

describe("código (RNE001)", () => {
    it("tem 31 símbolos, sem 0, O, 1, I, L", () => {
        expect(CODE_ALPHABET).toHaveLength(31);
        expect(new Set(CODE_ALPHABET).size).toBe(31);
        for (const c of "01OIL") expect(CODE_ALPHABET).not.toContain(c);
    });

    it("gera 8 símbolos do alfabeto, descartando bytes que dariam viés", () => {
        const bytes = Uint8Array.from({ length: 16 }, (_, i) => (i % 2 === 0 ? 255 : i));
        const code = generateCode(() => bytes);
        expect(code).toHaveLength(CODE_LENGTH);
        expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
        // 255 está acima de 248 (8 × 31) e nunca vira símbolo
        expect(code).toBe(
            [...bytes]
                .filter((b) => b < 248)
                .map((b) => CODE_ALPHABET[b % 31])
                .slice(0, 8)
                .join(""),
        );
    });

    it("pede mais bytes quando os primeiros são descartados", () => {
        let calls = 0;
        const code = generateCode((n) => {
            calls++;
            return new Uint8Array(n).fill(calls === 1 ? 250 : 0);
        });
        expect(calls).toBe(2);
        expect(code).toBe("22222222");
    });

    it("com bytes aleatórios de verdade, usa o alfabeto todo e não repete em mil salas", () => {
        const codes = new Set(
            Array.from({ length: 1000 }, () =>
                generateCode((n) => crypto.getRandomValues(new Uint8Array(n))),
            ),
        );
        expect(codes.size).toBe(1000);
        const seen = new Set([...codes].join(""));
        expect(seen.size).toBe(31);
    });

    it("mostra XXXX-XXXX e aceita com ou sem hífen, em qualquer caixa", () => {
        expect(formatCode("ABCD2345")).toBe("ABCD-2345");
        for (const input of ["abcd-2345", "ABCD2345", " abcd 2345 ", "AbCd-2345"]) {
            expect(normalizeCode(input)).toBe("ABCD2345");
        }
    });

    it.each([
        ["curto", "ABC-123"],
        ["longo", "ABCD23456"],
        ["com 0", "ABCD2340"],
        ["com O", "ABCD234O"],
        ["com 1", "ABCD2341"],
        ["com I", "ABCD234I"],
        ["com L", "ABCD234L"],
        ["com símbolo", "ABCD234!"],
        ["gigante", "A".repeat(10_000)],
        ["não é texto", 12345678],
        ["nulo", null],
    ])("recusa código %s", (_, input) => {
        expect(normalizeCode(input)).toBeNull();
    });
});

describe("prazos (C10)", () => {
    const created = new Date("2026-10-26T20:00:00Z");

    it("expira 3 horas depois de criada", () => {
        expect(roomExpiry(created, null).getTime() - created.getTime()).toBe(ROOM_TTL_MS);
    });

    it("expira 30 minutos depois do resultado, se vier antes das 3 horas", () => {
        const result = new Date(created.getTime() + 60 * 60 * 1000);
        expect(roomExpiry(created, result).getTime() - result.getTime()).toBe(RESULT_TTL_MS);
    });

    it("o resultado perto das 3 horas não prolonga a sala", () => {
        const result = new Date(created.getTime() + ROOM_TTL_MS - 60_000);
        expect(roomExpiry(created, result).getTime()).toBe(created.getTime() + ROOM_TTL_MS);
    });

    it("está expirada no instante do prazo", () => {
        const at = roomExpiry(created, null);
        expect(roomExpired(at, new Date(at.getTime() - 1))).toBe(false);
        expect(roomExpired(at, at)).toBe(true);
    });
});

describe("começar (C6)", () => {
    it("pede duas pessoas prontas", () => {
        expect(canStart([{ ready: true }])).toBe(false);
        expect(canStart([{ ready: true }, { ready: false }])).toBe(false);
        expect(canStart([{ ready: true }, { ready: true }, { ready: false }])).toBe(true);
    });
});

describe("passagem do papel de quem criou (C11, RNE010)", () => {
    const room: Seat[] = [
        { id: 10, position: 1, left: false },
        { id: 11, position: 2, left: false },
        { id: 12, position: 3, left: false },
    ];

    it("vai para a pessoa de menor ordem de entrada ainda na sala", () => {
        expect(nextCreator(room, 10)).toBe(11);
    });

    it("pula quem já saiu, mesmo com ordem menor", () => {
        const withGap = room.map((m) => (m.id === 11 ? { ...m, left: true } : m));
        expect(nextCreator(withGap, 10)).toBe(12);
    });

    it("não depende da ordem em que a lista chega", () => {
        expect(nextCreator([...room].reverse(), 10)).toBe(11);
    });

    it("sem ninguém para herdar, a sala encerra", () => {
        expect(nextCreator([{ id: 10, position: 1, left: false }], 10)).toBeNull();
        const onlyLeft = room.map((m) => (m.id === 10 ? m : { ...m, left: true }));
        expect(nextCreator(onlyLeft, 10)).toBeNull();
    });

    it("duas saídas seguidas: o papel termina com quem ficou", () => {
        // quem criou (10) sai; o papel vai para 11; 11 sai logo depois; o papel vai para 12
        const first = nextCreator(room, 10);
        const afterFirst = room.map((m) => (m.id === 10 ? { ...m, left: true } : m));
        expect(first).toBe(11);
        expect(nextCreator(afterFirst, 11)).toBe(12);
        // o inverso: 11 sai antes de 10; 10 segue criador e depois passa para 12
        const afterSecond = room.map((m) => (m.id === 11 ? { ...m, left: true } : m));
        expect(nextCreator(afterSecond, 10)).toBe(12);
    });
});

const title = (id: number, extra: Partial<FilterCandidate> = {}): FilterCandidate => ({
    id,
    type: "movie",
    rating: 7.5,
    votes: 2000,
    runtimeMinutes: 100,
    kinneGenres: ["drama"],
    streamingTmdbIds: [8],
    adult: false,
    feelings: 0,
    ...extra,
});

const person = (extra: Partial<MemberInput> = {}): MemberInput => ({
    streamings: [],
    genres: [],
    watched: [],
    scores: new Map(),
    ...extra,
});

const both = { type: "both", maxRuntime: null } as const;

describe("candidatos (RNE005)", () => {
    const ids = (list: FilterCandidate[]) => list.map((t) => t.id);

    it("fica no piso de qualidade e sem classificação 18", () => {
        const pool = [
            title(1),
            title(2, { rating: 6.3 }),
            title(3, { votes: 499 }),
            title(4, { adult: true }),
        ];
        expect(ids(roomCandidates(pool, [person()], both))).toEqual([1]);
    });

    it("streamings valem em união: basta um membro ter", () => {
        const pool = [title(1, { streamingTmdbIds: [8] }), title(2, { streamingTmdbIds: [307] })];
        const members = [person({ streamings: ["netflix"] }), person({ streamings: [] })];
        expect(ids(roomCandidates(pool, members, both))).toEqual([1]);
        const two = [person({ streamings: ["netflix"] }), person({ streamings: ["globoplay"] })];
        expect(ids(roomCandidates(pool, two, both))).toEqual([1, 2]);
    });

    it("ninguém marcou streaming: vale todos (RNG003)", () => {
        const pool = [title(1, { streamingTmdbIds: [8] }), title(2, { streamingTmdbIds: [307] })];
        expect(ids(roomCandidates(pool, [person(), person()], both))).toEqual([1, 2]);
    });

    it("cada pessoa que marcou gêneros precisa ser atendida; quem não marcou não restringe", () => {
        const pool = [
            title(1, { kinneGenres: ["comedy"] }),
            title(2, { kinneGenres: ["comedy", "drama"] }),
            title(3, { kinneGenres: ["drama"] }),
        ];
        // quem quer comédia e quem quer drama: só o que tem os dois agrada a cada um
        const members = [person({ genres: ["comedy"] }), person({ genres: ["drama"] }), person()];
        expect(ids(roomCandidates(pool, members, both))).toEqual([2]);
        const narrow = [person({ genres: ["comedy"] }), person({ genres: ["comedy"] })];
        expect(ids(roomCandidates(pool, narrow, both))).toEqual([1, 2]);
    });

    it("Romance só traz filmes (RNG007)", () => {
        const pool = [
            title(1, { type: "movie", kinneGenres: ["romance"] }),
            title(2, { type: "series", kinneGenres: ["romance"] }),
        ];
        expect(ids(roomCandidates(pool, [person({ genres: ["romance"] })], both))).toEqual([1]);
    });

    it("tipo e duração são de quem criou; a duração só vale com Filmes", () => {
        const pool = [
            title(1, { runtimeMinutes: 90 }),
            title(2, { runtimeMinutes: 130 }),
            title(3, { runtimeMinutes: null }),
            title(4, { type: "series", runtimeMinutes: 50 }),
        ];
        const movies = { type: "movie", maxRuntime: 105 } as const;
        expect(ids(roomCandidates(pool, [person()], movies))).toEqual([1]);
        expect(ids(roomCandidates(pool, [person()], { type: "series", maxRuntime: 105 }))).toEqual([
            4,
        ]);
        expect(ids(roomCandidates(pool, [person()], { type: "both", maxRuntime: 105 }))).toEqual([
            1, 2, 3, 4,
        ]);
    });

    it("o Já vi de qualquer pessoa tira o título, e os de rodadas anteriores não voltam", () => {
        const pool = [title(1), title(2), title(3)];
        const members = [person({ watched: [1] }), person({ watched: [] })];
        expect(ids(roomCandidates(pool, members, both, new Set([2])))).toEqual([3]);
    });
});

describe("finalistas (RNE005)", () => {
    const pool = Array.from({ length: 10 }, (_, i) => title(i + 1, { rating: 8 - i * 0.1 }));

    it("sem sinal em ninguém, vale a nota ponderada e saem 5", () => {
        const result = pickFinalists(pool, [person(), person()], both, new Set(), 7);
        expect(result.ok && result.finalists.map((f) => f.title.id)).toEqual([1, 2, 3, 4, 5]);
        expect(result.ok && result.finalists.every((f) => f.groupScore === null)).toBe(true);
    });

    it("com menos de 5 candidatos, todos; com menos de 3, recusa", () => {
        const four = pickFinalists(pool.slice(0, 4), [person()], both, new Set(), 7);
        expect(four.ok && four.finalists).toHaveLength(4);
        const two = pickFinalists(pool.slice(0, 2), [person()], both, new Set(), 7);
        expect(two).toEqual({ ok: false, candidates: 2 });
        expect(MAX_FINALISTS).toBe(5);
    });

    it("o gosto do menos satisfeito manda: quem agrada a um só não passa à frente", () => {
        // a pessoa A gosta muito do 6 e 7; a B, do 7 e 8; o 7 agrada às duas
        const a = person({
            scores: new Map([
                [6, 5],
                [7, 5],
                [8, 0.1],
            ]),
        });
        const b = person({
            scores: new Map([
                [6, 0.1],
                [7, 5],
                [8, 5],
            ]),
        });
        const result = pickFinalists(pool, [a, b], both, new Set(), 7);
        expect(result.ok && result.finalists[0].title.id).toBe(7);
    });

    it("quem não tem sinais não restringe o grupo", () => {
        const a = person({ scores: new Map([[9, 5]]) });
        const result = pickFinalists(pool, [a, person()], both, new Set(), 7);
        expect(result.ok && result.finalists[0].title.id).toBe(9);
    });

    it("é determinística: a mesma entrada dá os mesmos finalistas", () => {
        const a = person({
            scores: new Map([
                [4, 1],
                [5, 1],
            ]),
        });
        const first = pickFinalists(pool, [a], both, new Set(), 7);
        const second = pickFinalists([...pool].reverse(), [a], both, new Set(), 7);
        expect(first.ok && first.finalists.map((f) => f.title.id)).toEqual(
            second.ok && second.finalists.map((f) => f.title.id),
        );
    });

    it("preferências forjadas só estreitam o pool: nada fora do piso entra (B2)", () => {
        const sneaky = [
            title(1),
            title(2, { rating: 5 }),
            title(3, { adult: true }),
            title(4),
            title(5),
            title(6),
        ];
        const forged = person({
            scores: new Map([
                [2, 99],
                [3, 99],
            ]),
            genres: [],
        });
        const result = pickFinalists(sneaky, [forged], both, new Set(), 7);
        const ids = result.ok ? result.finalists.map((f) => f.title.id) : [];
        expect(ids).not.toContain(2);
        expect(ids).not.toContain(3);
    });
});

describe("vencedor (RNE006)", () => {
    const tally = (titleId: number, approvals: number, groupScore: number | null, quality = 7) => ({
        titleId,
        approvals,
        groupScore,
        quality,
    });

    it("é o finalista com mais Eu toparia", () => {
        expect(pickWinner([tally(1, 1, 0.9), tally(2, 3, 0.1), tally(3, 2, 0.5)])).toBe(2);
    });

    it("empate vai para a maior pontuação do grupo, depois para a nota ponderada", () => {
        expect(pickWinner([tally(1, 2, 0.3), tally(2, 2, 0.8)])).toBe(2);
        expect(pickWinner([tally(1, 2, null, 7.2), tally(2, 2, null, 7.9)])).toBe(2);
        expect(pickWinner([tally(5, 2, null, 7), tally(3, 2, null, 7)])).toBe(3);
    });

    it("ninguém topou: sem vencedor (C9)", () => {
        expect(pickWinner([tally(1, 0, 0.9), tally(2, 0, 0.1)])).toBeNull();
        expect(pickWinner([])).toBeNull();
    });
});

describe("todos votaram (C8)", () => {
    it("só quando todas as pessoas na sala votaram", () => {
        expect(everyoneVoted(2, 3)).toBe(false);
        expect(everyoneVoted(3, 3)).toBe(true);
        expect(everyoneVoted(0, 0)).toBe(false);
    });
});
