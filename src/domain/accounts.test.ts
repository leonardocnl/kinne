import { describe, expect, it } from "vitest";
import {
    cleanStreamings,
    codeFromNumber,
    deleteAccountEmail,
    hasSkippedStep,
    LIMITS,
    MAX_WATCHED,
    mergeBrowserIntoAccount,
    nextOnboardingStep,
    normalizeEmail,
    normalizeLoginCode,
    onboardingPercent,
    onboardingPrefill,
    SESSION_ABSOLUTE_MS,
    SESSION_SLIDING_MS,
    sessionAlive,
    sessionExpiry,
    signInEmail,
    type AccountTaste,
} from "./accounts";

describe("normalizeEmail (US012 RNE001)", () => {
    it("guarda em minúsculas e sem espaços nas pontas", () => {
        expect(normalizeEmail("  Ana@Exemplo.COM ")).toBe("ana@exemplo.com");
    });

    it.each([
        ["sem arroba", "ana.exemplo.com"],
        ["sem domínio", "ana@"],
        ["sem ponto no domínio", "ana@exemplo"],
        ["com espaço no meio", "a na@exemplo.com"],
        ["duas arrobas", "a@b@exemplo.com"],
        ["vazio", ""],
        ["só espaços", "   "],
        ["número", 12345],
        ["nulo", null],
        ["objeto", { toString: () => "a@b.co" }],
    ])("recusa %s", (_, input) => {
        expect(normalizeEmail(input)).toBeNull();
    });

    it("aceita 254 caracteres e recusa 255", () => {
        const domain = (last: number) =>
            [`${"b".repeat(63)}`, `${"c".repeat(63)}`, "d".repeat(last)].join(".") + ".co";
        const local = "a".repeat(64);
        expect(normalizeEmail(`${local}@${domain(58)}`)).toHaveLength(254);
        expect(normalizeEmail(`${local}@${domain(59)}`)).toBeNull();
    });

    it("recusa local com mais de 64 caracteres e rótulo com mais de 63", () => {
        expect(normalizeEmail(`${"a".repeat(65)}@b.co`)).toBeNull();
        expect(normalizeEmail(`a@${"b".repeat(64)}.co`)).toBeNull();
    });

    // revisão B4: um endereço só, no mesmo critério do CHECK users_email_check
    it.each([
        ["lista com vírgula", "a@x.com,b@y.com"],
        ["lista com ponto e vírgula", "a@x.com;b@y.com"],
        ["endereço entre < e >", "<a@b.com>"],
        ["aspas duplas", '"a"@b.com'],
        ["aspas simples", "a'b@x.com"],
        ["ponto duplo no local", "a..b@x.com"],
        ["ponto no começo do local", ".a@x.com"],
        ["ponto no fim do local", "a.@x.com"],
        ["sublinhado no domínio", "a@x_y.com"],
        ["rótulo começando com hífen", "a@-x.com"],
        ["ponto duplo no domínio", "a@x..com"],
        ["caractere não ASCII", "joão@exemplo.com"],
        ["domínio de uma letra no fim", "a@b.c"],
        ["domínio só com números (IP)", "a@1.2"],
        ["quebra de linha no meio", "a@b.com\nc@d.com"],
        ["tabulação", "a@b.com\tx"],
    ])("recusa %s", (_, input) => {
        expect(normalizeEmail(input)).toBeNull();
    });

    it.each([
        "ana.silva+kinne@exemplo.com.br",
        "a_b-c@sub.dominio.co",
        "x@xn--e1afmkfd.xn--p1ai",
        "o=k@exemplo.com",
    ])("aceita %s", (input) => {
        expect(normalizeEmail(input)).toBe(input);
    });

    it("recusa texto gigante sem o processar", () => {
        expect(normalizeEmail("a".repeat(1_000_000) + "@b.co")).toBeNull();
    });
});

describe("normalizeLoginCode (US012 C3)", () => {
    it("aceita 6 dígitos, com espaço ou hífen no meio", () => {
        for (const input of ["482913", "482 913", "482-913", " 482913 "]) {
            expect(normalizeLoginCode(input)).toBe("482913");
        }
    });

    it.each(["48291", "4829133", "48291a", "", "٤٨٢٩١٣", "482913\n482913", "4 8 2 9 1 3 4"])(
        "recusa %j",
        (input) => {
            expect(normalizeLoginCode(input)).toBeNull();
        },
    );

    it("recusa o que não é texto", () => {
        expect(normalizeLoginCode(482913)).toBeNull();
        expect(normalizeLoginCode(null)).toBeNull();
    });
});

describe("codeFromNumber", () => {
    it("completa com zeros à esquerda", () => {
        expect(codeFromNumber(0)).toBe("000000");
        expect(codeFromNumber(42)).toBe("000042");
        expect(codeFromNumber(999999)).toBe("999999");
    });

    it("recusa fora da faixa", () => {
        for (const n of [-1, 1_000_000, 1.5, Number.NaN]) {
            expect(() => codeFromNumber(n)).toThrow(RangeError);
        }
    });
});

describe("texto do e-mail (US012 RNE006)", () => {
    it("traz o código e nada além, sem link", () => {
        const { text, subject } = signInEmail("482913");
        expect(text).toBe(
            "Seu código do Kinne: 482 913. Vale por 10 minutos. Se não foi você, ignore este e-mail.",
        );
        expect(subject).toBe("Seu código do Kinne");
        expect(text).not.toMatch(/https?:|www\./);
    });

    it("o código de apagar a conta também não traz link", () => {
        expect(deleteAccountEmail("000123").text).toContain("000 123");
        expect(deleteAccountEmail("000123").text).not.toMatch(/https?:|www\./);
    });
});

describe("limites (RNE004)", () => {
    it("por e-mail, 1 a cada 60 s e 5 por hora; abaixo do plano gratuito por dia", () => {
        expect(LIMITS.emailCooldown.capacity).toBe(1);
        expect(LIMITS.emailCooldown.perSecond).toBeCloseTo(1 / 60);
        expect(LIMITS.emailHour.capacity).toBe(5);
        expect(LIMITS.emailHour.perSecond).toBeCloseTo(5 / 3600);
        expect(LIMITS.dailyEmails).toBeLessThan(100);
    });
});

describe("sessão (US012 RNE005, A2)", () => {
    const created = new Date("2026-11-01T12:00:00Z");
    const days = (n: number) => n * 24 * 60 * 60 * 1000;

    it("renova por 30 dias a cada uso", () => {
        const now = new Date(created.getTime() + days(10));
        expect(sessionExpiry(created, now).getTime() - now.getTime()).toBe(SESSION_SLIDING_MS);
    });

    it("nunca passa de 90 dias desde o login", () => {
        const now = new Date(created.getTime() + days(80));
        expect(sessionExpiry(created, now).getTime()).toBe(created.getTime() + SESSION_ABSOLUTE_MS);
    });

    it("morre no teto mesmo com uso diário", () => {
        let expiresAt = sessionExpiry(created, created);
        for (let day = 1; day <= 120; day++) {
            const now = new Date(created.getTime() + days(day));
            if (!sessionAlive({ expiresAt, createdAt: created }, now)) {
                expect(day).toBeGreaterThanOrEqual(90);
                return;
            }
            expiresAt = sessionExpiry(created, now);
        }
        throw new Error("a sessão passou do teto de 90 dias");
    });

    it("sem uso, morre em 30 dias", () => {
        const expiresAt = sessionExpiry(created, created);
        const later = new Date(created.getTime() + days(31));
        expect(sessionAlive({ expiresAt, createdAt: created }, later)).toBe(false);
        const sooner = new Date(created.getTime() + days(29));
        expect(sessionAlive({ expiresAt, createdAt: created }, sooner)).toBe(true);
    });
});

const empty: AccountTaste = {
    streamings: [],
    signals: { liked: [], willWatch: [], disliked: [] },
    watched: [],
};

describe("mergeBrowserIntoAccount (US015 RNE002)", () => {
    it("no conflito do mesmo título, o navegador vence", () => {
        const account: AccountTaste = {
            ...empty,
            signals: { liked: [1, 2], willWatch: [3], disliked: [4] },
        };
        const browser: AccountTaste = {
            ...empty,
            signals: { liked: [4], willWatch: [], disliked: [1] },
        };
        expect(mergeBrowserIntoAccount(account, browser).signals).toEqual({
            liked: [2, 4],
            willWatch: [3],
            disliked: [1],
        });
    });

    it("os do navegador entram como os mais recentes de cada lista", () => {
        const account = { ...empty, signals: { liked: [1, 2], willWatch: [], disliked: [] } };
        const browser = { ...empty, signals: { liked: [9], willWatch: [], disliked: [] } };
        expect(mergeBrowserIntoAccount(account, browser).signals.liked).toEqual([1, 2, 9]);
    });

    it("cada lista guarda os 200 mais recentes", () => {
        const many = Array.from({ length: 200 }, (_, i) => i + 1);
        const account = { ...empty, signals: { liked: many, willWatch: [], disliked: [] } };
        const browser = { ...empty, signals: { liked: [1000, 1001], willWatch: [], disliked: [] } };
        const liked = mergeBrowserIntoAccount(account, browser).signals.liked;
        expect(liked).toHaveLength(200);
        expect(liked.slice(-2)).toEqual([1000, 1001]);
        expect(liked[0]).toBe(3);
    });

    it('"Já vi" é a união, sem repetir', () => {
        const merged = mergeBrowserIntoAccount(
            { ...empty, watched: [1, 2, 3] },
            { ...empty, watched: [3, 4] },
        );
        expect(merged.watched).toEqual([1, 2, 3, 4]);
    });

    it('"Já vi" guarda os 2000 mais recentes', () => {
        const old = Array.from({ length: MAX_WATCHED }, (_, i) => i + 1);
        const merged = mergeBrowserIntoAccount(
            { ...empty, watched: old },
            { ...empty, watched: [5000, 5001] },
        );
        expect(merged.watched).toHaveLength(MAX_WATCHED);
        expect(merged.watched.slice(-2)).toEqual([5000, 5001]);
    });

    it("streamings: os da conta, ou os do navegador se a conta não tem nenhum", () => {
        expect(
            mergeBrowserIntoAccount(
                { ...empty, streamings: ["netflix"] },
                { ...empty, streamings: ["max", "globoplay"] },
            ).streamings,
        ).toEqual(["netflix"]);
        expect(
            mergeBrowserIntoAccount(empty, { ...empty, streamings: ["max", "globoplay"] })
                .streamings,
        ).toEqual(["max", "globoplay"]);
    });

    it("navegador vazio não muda a conta", () => {
        const account: AccountTaste = {
            streamings: ["netflix"],
            signals: { liked: [1], willWatch: [2], disliked: [3] },
            watched: [4],
        };
        expect(mergeBrowserIntoAccount(account, empty)).toEqual(account);
    });
});

describe("cleanStreamings", () => {
    it("só os cinco ids, sem repetir", () => {
        expect(cleanStreamings(["netflix", "hbo", "netflix", 3, "max"])).toEqual([
            "netflix",
            "max",
        ]);
        expect(cleanStreamings("netflix")).toEqual([]);
    });
});

describe("onboarding (US013)", () => {
    it("começa no passo 1 e segue até o fim", () => {
        expect(nextOnboardingStep({})).toBe(1);
        expect(nextOnboardingStep({ 1: "done" })).toBe(2);
        expect(nextOnboardingStep({ 1: "done", 2: "done" })).toBe(3);
        expect(nextOnboardingStep({ 1: "done", 2: "done", 3: "done" })).toBeNull();
    });

    it("passo pulado já foi respondido: não volta a ser o próximo (C4, C5)", () => {
        expect(nextOnboardingStep({ 1: "skipped" })).toBe(2);
        expect(nextOnboardingStep({ 2: "done" })).toBe(1);
    });

    it("a barra cresce um terço a cada passo respondido", () => {
        expect(onboardingPercent({})).toBe(0);
        expect(onboardingPercent({ 1: "done" })).toBe(33);
        expect(onboardingPercent({ 1: "done", 3: "skipped" })).toBe(67);
        expect(onboardingPercent({ 1: "done", 2: "done", 3: "done" })).toBe(100);
    });

    it("o perfil avisa quando algum passo foi pulado", () => {
        expect(hasSkippedStep({ 1: "done", 2: "skipped" })).toBe(true);
        expect(hasSkippedStep({ 1: "done", 2: "done", 3: "done" })).toBe(false);
        expect(hasSkippedStep({})).toBe(false);
    });

    it("já vem com o que o navegador tinha, até 3, os mais recentes (C3)", () => {
        const browser = {
            signals: { liked: [1, 2, 3, 4, 5], willWatch: [], disliked: [8, 9] },
            streamings: ["netflix" as const],
        };
        expect(onboardingPrefill(1, browser).titleIds).toEqual([3, 4, 5]);
        expect(onboardingPrefill(2, browser).titleIds).toEqual([8, 9]);
        expect(onboardingPrefill(3, browser).streamings).toEqual(["netflix"]);
    });
});
