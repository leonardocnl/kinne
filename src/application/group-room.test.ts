import { describe, expect, it, vi } from "vitest";
import type { FilterCandidate } from "@/domain/filters";
import { toNeighborGraph } from "@/domain/taste-graph";
import {
    buildRoomView,
    computeFinalists,
    loadRoom,
    proposeFinalists,
    type GroupRoomRepository,
    type ProposalInput,
    type RoomSnapshot,
} from "./group-room";

const NOW = new Date("2026-10-26T20:00:00Z");
const inHours = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

const finalist = (titleId: number, extra: Partial<RoomSnapshot["finalists"][number]> = {}) => ({
    titleId,
    position: titleId,
    slug: `titulo-${titleId}`,
    title: `Título ${titleId}`,
    year: 2020,
    poster: `/p${titleId}.jpg`,
    streamingTmdbIds: [8, 307],
    approvals: null,
    mine: null,
    ...extra,
});

function snapshot(extra: Partial<RoomSnapshot> & { room?: Partial<RoomSnapshot["room"]> } = {}) {
    const { room, ...rest } = extra;
    return {
        room: {
            id: 1,
            phase: "voting",
            round: 1,
            typeChoice: "both",
            maxRuntime: null,
            expiresAt: inHours(2),
            resultAt: null,
            creatorMemberId: 10,
            code: null,
            ...room,
        },
        me: { id: 11, position: 2, ready: true, streamings: ["netflix"], genres: [] },
        marked: ["netflix"],
        members: [
            { id: 10, position: 1, ready: true, voted: true },
            { id: 11, position: 2, ready: true, voted: false },
            { id: 12, position: 3, ready: true, voted: false },
        ],
        finalists: [finalist(1), finalist(2), finalist(3)],
        ...rest,
    } as RoomSnapshot;
}

function fakeRepository(overrides: Partial<GroupRoomRepository> = {}) {
    const repository = {
        create: vi.fn(),
        join: vi.fn(),
        leave: vi.fn(),
        purge: vi.fn().mockResolvedValue(undefined),
        snapshot: vi.fn().mockResolvedValue(snapshot()),
        proposalInput: vi.fn(),
        tallies: vi.fn().mockResolvedValue([]),
        updatePreferences: vi.fn(),
        updateSettings: vi.fn(),
        startVoting: vi.fn().mockResolvedValue(true),
        nextRound: vi.fn().mockResolvedValue(true),
        castVote: vi.fn(),
        closeVoting: vi.fn(),
        closeIfEveryoneVoted: vi.fn().mockResolvedValue(false),
        ...overrides,
    };
    return repository as typeof repository & GroupRoomRepository;
}

const deps = (repository: GroupRoomRepository) => ({
    repository,
    now: () => NOW,
    meanRating: async () => 7,
});

describe("loadRoom: o que a tela vê", () => {
    it("sem sala para o cookie, ou depois de sair: encerrada (C10)", async () => {
        const repository = fakeRepository({ snapshot: vi.fn().mockResolvedValue(null) });
        expect(await loadRoom(deps(repository), "h")).toEqual({ kind: "ended" });
    });

    it("sala vencida vale como encerrada e é apagada na hora (C2, C10)", async () => {
        const repository = fakeRepository({
            snapshot: vi.fn().mockResolvedValue(snapshot({ room: { expiresAt: inHours(-1) } })),
        });
        expect(await loadRoom(deps(repository), "h")).toEqual({ kind: "ended" });
        expect(repository.purge).toHaveBeenCalledOnce();
    });

    it("C4: na votação, o total por finalista não sai nem se o banco o mandasse", () => {
        const leaky = snapshot({ finalists: [finalist(1, { approvals: 7, mine: true })] });
        const view = buildRoomView(leaky, null);
        expect(view.finalists[0].approvals).toBeNull();
        expect(view.finalists[0].mine).toBe(true);
        expect(JSON.stringify(view)).not.toMatch(/"approvals":[1-9]/);
    });

    it("C4: a tela sabe quem já votou, mas não em quê, e as pessoas não têm nome (RNE004)", () => {
        const view = buildRoomView(snapshot(), null);
        expect(view.people).toEqual([
            { position: 1, ready: true, voted: true, isMe: false },
            { position: 2, ready: true, voted: false, isMe: true },
            { position: 3, ready: true, voted: false, isMe: false },
        ]);
        expect(view.voted).toBe(1);
        // nenhum id de membro sai: só a ordem de entrada
        expect(JSON.stringify(view)).not.toMatch(/"id"|memberId|tokenHash/);
    });

    it("C7: cada finalista traz cartaz, título, ano e onde está (entre os streamings da sala)", () => {
        const view = buildRoomView(snapshot(), null);
        expect(view.finalists[0]).toMatchObject({
            title: "Título 1",
            year: 2020,
            poster: "/p1.jpg",
            where: ["netflix"],
        });
    });

    it("C1/RNG003: ninguém marcou streaming, o título mostra todos os que tem", () => {
        const view = buildRoomView(snapshot({ marked: [] }), null);
        expect(view.finalists[0].where).toEqual(["netflix", "globoplay"]);
    });

    it("o código só aparece no saguão", () => {
        const lobby = snapshot({ room: { phase: "lobby", code: "ABCD2345" } });
        expect(buildRoomView(lobby, null).code).toBe("ABCD2345");
        expect(buildRoomView(snapshot({ room: { code: "ABCD2345" } }), null).code).toBeNull();
    });

    it("quem criou vê as ações dele; as outras pessoas não", () => {
        const creator = snapshot({
            me: { id: 10, position: 1, ready: true, streamings: [], genres: [] },
        });
        expect(buildRoomView(creator, null).isCreator).toBe(true);
        expect(buildRoomView(snapshot(), null).isCreator).toBe(false);
    });

    it("C8: todos votaram, a votação fecha na leitura e a tela mostra o resultado", async () => {
        const allVoted = snapshot({
            members: [
                { id: 10, position: 1, ready: true, voted: true },
                { id: 11, position: 2, ready: true, voted: true },
            ],
        });
        const result = snapshot({
            room: { phase: "result" },
            finalists: [finalist(1, { approvals: 2 }), finalist(2, { approvals: 1 })],
        });
        const repository = fakeRepository({
            snapshot: vi.fn().mockResolvedValueOnce(allVoted).mockResolvedValueOnce(result),
            closeIfEveryoneVoted: vi.fn().mockResolvedValue(true),
            tallies: vi.fn().mockResolvedValue([
                { titleId: 1, groupScore: 0.4, rating: 7.5, votes: 900, approvals: 2 },
                { titleId: 2, groupScore: 0.9, rating: 8, votes: 900, approvals: 1 },
            ]),
        });
        const view = await loadRoom(deps(repository), "h");
        expect(view.kind === "room" && view.phase).toBe("result");
        expect(view.kind === "room" && view.finalists.map((f) => f.winner)).toEqual([true, false]);
        expect(view.kind === "room" && view.finalists.map((f) => f.approvals)).toEqual([2, 1]);
    });

    it("C9: ninguém topou, e só quem criou vê Outra rodada", async () => {
        const nobody = snapshot({
            room: { phase: "result" },
            me: { id: 10, position: 1, ready: true, streamings: [], genres: [] },
            finalists: [finalist(1, { approvals: 0 }), finalist(2, { approvals: 0 })],
        });
        const repository = fakeRepository({
            snapshot: vi.fn().mockResolvedValue(nobody),
            tallies: vi.fn().mockResolvedValue([
                { titleId: 1, groupScore: 0.4, rating: 7.5, votes: 900, approvals: 0 },
                { titleId: 2, groupScore: 0.9, rating: 8, votes: 900, approvals: 0 },
            ]),
        });
        const view = await loadRoom(deps(repository), "h");
        expect(view.kind === "room" && view.nobody).toBe(true);
        expect(view.kind === "room" && view.canNextRound).toBe(true);
        const other = buildRoomView({ ...nobody, me: { ...nobody.me, id: 11 } }, null);
        expect(other.canNextRound).toBe(false);
        // na 3ª rodada não há outra (RNE008)
        const third = buildRoomView({ ...nobody, room: { ...nobody.room, round: 3 } }, null);
        expect(third.canNextRound).toBe(false);
    });

    it("C6: Ver as opções só fica ativo com duas pessoas prontas", () => {
        const lobby = snapshot({ room: { phase: "lobby" } });
        expect(buildRoomView(lobby, null).canStart).toBe(true);
        const onlyOne = {
            ...lobby,
            members: lobby.members.map((m) => ({ ...m, ready: m.id === 10 })),
        };
        expect(buildRoomView(onlyOne, null).canStart).toBe(false);
    });
});

const title = (id: number, extra: Partial<FilterCandidate> = {}): FilterCandidate => ({
    id,
    type: "movie",
    rating: 8 - id * 0.05,
    votes: 2000,
    runtimeMinutes: 100,
    kinneGenres: ["drama"],
    streamingTmdbIds: [8],
    adult: false,
    feelings: 0,
    ...extra,
});

const member = (id: number, extra: Partial<ProposalInput["members"][number]> = {}) => ({
    id,
    ready: true,
    streamings: [],
    genres: [],
    watched: [],
    liked: [],
    willWatch: [],
    disliked: [],
    ...extra,
});

const proposal = (extra: Partial<ProposalInput> = {}): ProposalInput => ({
    room: { id: 1, phase: "lobby", round: 1, typeChoice: "both", maxRuntime: null },
    members: [member(10), member(11)],
    previous: [],
    ...extra,
});

const pool = Array.from({ length: 12 }, (_, i) => title(i + 1));

describe("proposeFinalists (C6, C9, RNE005)", () => {
    it("começa a votação com os finalistas calculados no servidor", async () => {
        const repository = fakeRepository({ proposalInput: vi.fn().mockResolvedValue(proposal()) });
        const outcome = await proposeFinalists(
            repository,
            { candidates: pool, graph: null },
            "h",
            "lobby",
        );
        expect(outcome).toEqual({ kind: "started" });
        expect(repository.startVoting).toHaveBeenCalledWith({
            tokenHash: "h",
            titleIds: [1, 2, 3, 4, 5],
            scores: [null, null, null, null, null],
        });
    });

    it("quem não criou (nada volta do banco) é recusado (A3)", async () => {
        const repository = fakeRepository({ proposalInput: vi.fn().mockResolvedValue(null) });
        const outcome = await proposeFinalists(
            repository,
            { candidates: pool, graph: null },
            "h",
            "lobby",
        );
        expect(outcome).toEqual({ kind: "refused" });
        expect(repository.startVoting).not.toHaveBeenCalled();
    });

    it("fase errada é recusada: começar fora do saguão, outra rodada fora do resultado (B4)", async () => {
        const voting = proposal({ room: { ...proposal().room, phase: "voting" } });
        const repository = fakeRepository({ proposalInput: vi.fn().mockResolvedValue(voting) });
        for (const phase of ["lobby", "result"] as const) {
            expect(
                await proposeFinalists(repository, { candidates: pool, graph: null }, "h", phase),
            ).toEqual({ kind: "refused" });
        }
    });

    it("com menos de duas pessoas prontas, recusa (C6)", async () => {
        const repository = fakeRepository({
            proposalInput: vi
                .fn()
                .mockResolvedValue(
                    proposal({ members: [member(10), member(11, { ready: false })] }),
                ),
        });
        expect(
            await proposeFinalists(repository, { candidates: pool, graph: null }, "h", "lobby"),
        ).toEqual({ kind: "refused" });
    });

    it("poucas opções: a sala continua no saguão (RNE005)", async () => {
        const repository = fakeRepository({ proposalInput: vi.fn().mockResolvedValue(proposal()) });
        const outcome = await proposeFinalists(
            repository,
            { candidates: pool.slice(0, 2), graph: null },
            "h",
            "lobby",
        );
        expect(outcome).toEqual({ kind: "few-options" });
        expect(repository.startVoting).not.toHaveBeenCalled();
    });

    it("se a troca de fase não acontece (outra pessoa começou antes), recusa (B4)", async () => {
        const repository = fakeRepository({
            proposalInput: vi.fn().mockResolvedValue(proposal()),
            startVoting: vi.fn().mockResolvedValue(false),
        });
        expect(
            await proposeFinalists(repository, { candidates: pool, graph: null }, "h", "lobby"),
        ).toEqual({ kind: "refused" });
    });

    it("C9: outra rodada não repete os finalistas anteriores", async () => {
        const second = proposal({
            room: { ...proposal().room, phase: "result" },
            previous: [1, 2, 3, 4, 5],
        });
        const repository = fakeRepository({ proposalInput: vi.fn().mockResolvedValue(second) });
        await proposeFinalists(repository, { candidates: pool, graph: null }, "h", "result");
        expect(repository.nextRound).toHaveBeenCalledWith({
            tokenHash: "h",
            titleIds: [6, 7, 8, 9, 10],
            scores: [null, null, null, null, null],
        });
    });
});

describe("computeFinalists: o gosto do grupo (design §7)", () => {
    // 20 liga 21 e 22 (gosto da pessoa A); 30 liga 31 (gosto da pessoa B)
    const edges = [
        { a: 20, b: 21, proximity: 0.9 },
        { a: 20, b: 22, proximity: 0.4 },
        { a: 30, b: 31, proximity: 0.9 },
        { a: 20, b: 31, proximity: 0.3 },
        { a: 30, b: 22, proximity: 0.3 },
    ];
    const graph = toNeighborGraph(edges);
    const candidates = [20, 21, 22, 30, 31, 40, 41].map((id) => title(id, { rating: 7 }));

    it("o título que agrada às duas pessoas vem à frente do que agrada a uma só", () => {
        const input = proposal({
            members: [member(10, { liked: [20] }), member(11, { liked: [30] })],
        });
        const result = computeFinalists({ candidates, graph }, input);
        expect(result.ok && result.finalists[0].title.id).toBe(22);
        expect(result.ok && result.finalists[0].groupScore).not.toBeNull();
    });

    it("sem o grafo, vale a nota ponderada e o grupo continua", () => {
        const input = proposal({ members: [member(10, { liked: [20] }), member(11)] });
        const result = computeFinalists({ candidates: pool, graph: null }, input);
        expect(result.ok && result.finalists.map((f) => f.title.id)).toEqual([1, 2, 3, 4, 5]);
    });

    it("ids forjados em liked não trazem título fora dos filtros (B3)", () => {
        const withAdult = [...candidates, title(50, { adult: true })];
        const forged = toNeighborGraph([...edges, { a: 20, b: 50, proximity: 1 }]);
        const input = proposal({ members: [member(10, { liked: [20, 50, 999999] }), member(11)] });
        const result = computeFinalists({ candidates: withAdult, graph: forged }, input);
        expect(result.ok && result.finalists.map((f) => f.title.id)).not.toContain(50);
    });

    it("valores desconhecidos de streaming e gênero guardados são ignorados", () => {
        const input = proposal({
            members: [
                member(10, { streamings: ["hbo", "netflix"], genres: ["horror"] }),
                member(11),
            ],
        });
        const result = computeFinalists({ candidates: pool, graph: null }, input);
        expect(result.ok).toBe(true);
    });
});
