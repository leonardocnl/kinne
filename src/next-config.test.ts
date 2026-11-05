import { afterEach, describe, expect, it, vi } from "vitest";

// security.md §6: the production build strips every console call of our own from the client.
describe("next.config compiler.removeConsole", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    const load = async (env: string) => {
        vi.stubEnv("NODE_ENV", env);
        vi.resetModules();
        return (await import("../next.config")).default;
    };

    it("removes every level in production", async () => {
        expect((await load("production")).compiler?.removeConsole).toBe(true);
    });

    it("keeps console in development", async () => {
        expect((await load("development")).compiler?.removeConsole).toBe(false);
    });
});
