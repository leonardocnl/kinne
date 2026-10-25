import { describe, expect, it } from "vitest";
import { clientKey, getClientIp, ipBucket } from "./client-ip";

const vercel = { VERCEL: "1" };
const day = new Date("2026-10-12T15:00:00Z");
const SECRET = "k".repeat(43);

describe("getClientIp (G1, H8)", () => {
    it("usa o valor que a plataforma grava, não o X-Forwarded-For forjado", () => {
        const headers = new Headers({
            "x-forwarded-for": "6.6.6.6, 1.2.3.4",
            "x-real-ip": "203.0.113.7",
        });
        expect(getClientIp(headers, vercel)).toBe("203.0.113.7");
    });

    it("ignora X-Forwarded-For sozinho: cada pedido forjado cai no mesmo balde", () => {
        const forged = (ip: string) => new Headers({ "x-forwarded-for": ip });
        expect(getClientIp(forged("1.1.1.1"), vercel)).toBeNull();
        expect(clientKey(getClientIp(forged("1.1.1.1"), vercel), SECRET, day)).toBe(
            clientKey(getClientIp(forged("2.2.2.2"), vercel), SECRET, day),
        );
    });

    it("fora da Vercel não confia em cabeçalho nenhum", () => {
        expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.7" }), {})).toBeNull();
    });

    it("recusa valor que não é IP", () => {
        expect(getClientIp(new Headers({ "x-real-ip": "1.2.3.4, 5.6.7.8" }), vercel)).toBeNull();
    });
});

describe("ipBucket (G2)", () => {
    it("IPv4 inteiro", () => {
        expect(ipBucket("203.0.113.7")).toBe("203.0.113.7");
    });

    it("IPv6 da mesma /64 cai no mesmo balde, escrito de qualquer jeito", () => {
        const a = ipBucket("2001:db8:abcd:12:1111:2222:3333:4444");
        expect(a).toBe("2001:db8:abcd:12::/64");
        expect(ipBucket("2001:0db8:ABCD:0012::1")).toBe(a);
        expect(ipBucket("2001:db8:abcd:12:ffff::")).toBe(a);
        expect(ipBucket("2001:db8:abcd:12::5%eth0")).toBe(a);
    });

    it("/64 diferente, balde diferente", () => {
        expect(ipBucket("2001:db8:abcd:13::1")).not.toBe(ipBucket("2001:db8:abcd:12::1"));
    });

    it("prefixos com :: no meio", () => {
        expect(ipBucket("2001:db8::1")).toBe("2001:db8:0:0::/64");
        expect(ipBucket("::1")).toBe("0:0:0:0::/64");
        expect(ipBucket("64:ff9b::192.0.2.33")).toBe("64:ff9b:0:0::/64");
    });

    it("IPv4 mapeado em IPv6 conta como o IPv4", () => {
        expect(ipBucket("::ffff:203.0.113.7")).toBe("203.0.113.7");
    });

    it("sem IP, um balde só", () => {
        expect(ipBucket(null)).toBe("unknown");
    });
});

describe("clientKey (E2, G16)", () => {
    it("não contém o IP e não é reversível sem o segredo", () => {
        const key = clientKey("203.0.113.7", SECRET, day)!;
        expect(key).toMatch(/^[0-9a-f]{32}$/);
        expect(key).not.toContain("203");
        expect(clientKey("203.0.113.7", "x".repeat(43), day)).not.toBe(key);
    });

    it("o sal muda a cada dia (UTC): chaves de ontem não se ligam às de hoje", () => {
        const today = clientKey("203.0.113.7", SECRET, day);
        expect(clientKey("203.0.113.7", SECRET, new Date("2026-10-12T23:59:59Z"))).toBe(today);
        expect(clientKey("203.0.113.7", SECRET, new Date("2026-10-13T00:00:00Z"))).not.toBe(today);
    });

    it("sem segredo não decide (E3)", () => {
        expect(clientKey("203.0.113.7", undefined, day)).toBeNull();
    });
});
