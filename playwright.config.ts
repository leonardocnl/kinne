import { defineConfig } from "@playwright/test";

const APP = "http://127.0.0.1:3100";
const NO_DB = "http://127.0.0.1:3101";

// Runs on the built app (`npm run build` first), like the e2e suites. The second server has an
// unreachable database, which is how the error screens are reached without touching app code.
const start = (port: number) =>
    `node node_modules/next/dist/bin/next start -p ${port} -H 127.0.0.1`;

export default defineConfig({
    testDir: "e2e",
    testMatch: "*.visual.ts",
    globalSetup: "./e2e/visual-guard.ts",
    fullyParallel: true,
    workers: 4,
    retries: 0,
    timeout: 60_000,
    snapshotPathTemplate: "e2e/visual-baseline/{arg}-{projectName}{ext}",
    expect: {
        toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0 },
    },
    use: {
        baseURL: APP,
        reducedMotion: "reduce",
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
    },
    projects: [
        { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
        { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    ],
    webServer: [
        { command: start(3100), url: `${APP}/sobre`, reuseExistingServer: false },
        {
            command: start(3101),
            url: `${NO_DB}/sobre`,
            reuseExistingServer: false,
            stderr: "ignore", // every failed query logs here, on purpose
            env: { DATABASE_URL_POOLED: "postgresql://visual:visual@127.0.0.1:1/visual" },
        },
    ],
});
