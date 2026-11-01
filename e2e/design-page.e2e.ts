import { afterAll, beforeAll, expect, it } from "vitest";
import { type RunningApp, startBuiltApp } from "./server";

// security.md §3: the design reference exists only in development.
let app: RunningApp;
beforeAll(async () => {
    app = await startBuiltApp();
});
afterAll(async () => {
    await app?.stop();
});

it("/design answers 404 in the production build", async () => {
    const response = await fetch(`${app.origin}/design`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("Sistema de design");
});
