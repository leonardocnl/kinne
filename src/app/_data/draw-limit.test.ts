import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ip = vi.hoisted(() => ({ value: "203.0.113.7" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": ip.value }) }));
vi.mock("@/infrastructure/client-ip", () => ({
    getClientIp: (h: Headers) => h.get("x-real-ip"),
    clientKey: (value: string) => value,
    ipBucket: (value: string) => value,
}));
vi.mock("@/infrastructure/search-config", () => ({ searchConfig: () => ({ secret: "s" }) }));

describe("admitFilterList (security.md §7)", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
        ip.value = "203.0.113.7";
    });
    afterEach(() => vi.useRealTimers());

    it("aceita uma rajada de 20 do mesmo IP (um grupo atrás de CGNAT) e recusa a 21ª", async () => {
        const { admitFilterList, FILTER_LIST_BURST } = await import("./draw-limit");
        expect(FILTER_LIST_BURST).toBe(20);
        for (let i = 0; i < 20; i++) expect(await admitFilterList()).toBe(true);
        expect(await admitFilterList()).toBe(false);
    });

    it("devolve uma ficha a cada 20 segundos", async () => {
        const { admitFilterList, FILTER_LIST_SECONDS_PER_TOKEN } = await import("./draw-limit");
        expect(FILTER_LIST_SECONDS_PER_TOKEN).toBe(20);
        for (let i = 0; i < 20; i++) await admitFilterList();
        vi.advanceTimersByTime(19_000);
        expect(await admitFilterList()).toBe(false);
        vi.advanceTimersByTime(1_000);
        expect(await admitFilterList()).toBe(true);
        expect(await admitFilterList()).toBe(false);
    });

    it("cada visitante tem a sua conta, sem gastar a dos sorteios", async () => {
        const { admitDraw, admitFilterList } = await import("./draw-limit");
        for (let i = 0; i < 20; i++) await admitFilterList();
        expect(await admitDraw()).toBe(true);
        ip.value = "198.51.100.9";
        expect(await admitFilterList()).toBe(true);
    });
});
