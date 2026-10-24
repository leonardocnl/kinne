// Sobe `next start` sobre o build existente (.next) numa porta livre e o derruba ao fim.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";

async function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once("error", reject);
        probe.listen(0, "127.0.0.1", () => {
            const { port } = probe.address() as { port: number };
            probe.close(() => resolve(port));
        });
    });
}

export type RunningApp = { origin: string; stop: () => Promise<void> };

export async function startBuiltApp(): Promise<RunningApp> {
    if (!existsSync(".next/BUILD_ID")) {
        throw new Error("Nenhum build em .next: rode `npm run build` antes dos testes e2e.");
    }
    const port = await freePort();
    // Sem segredos nem banco: os cabeçalhos não dependem deles.
    const child: ChildProcess = spawn(
        process.execPath,
        ["node_modules/next/dist/bin/next", "start", "-p", String(port), "-H", "127.0.0.1"],
        { env: { ...process.env, NODE_ENV: "production" }, stdio: "ignore" },
    );
    const origin = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 30_000;
    for (;;) {
        if (child.exitCode !== null) throw new Error("`next start` encerrou ao subir.");
        try {
            await fetch(`${origin}/`);
            break;
        } catch {
            if (Date.now() > deadline) {
                child.kill();
                throw new Error("`next start` não respondeu em 30 s.");
            }
            await new Promise((r) => setTimeout(r, 250));
        }
    }
    return {
        origin,
        stop: () =>
            new Promise((resolve) => {
                if (child.exitCode !== null) return resolve();
                child.once("exit", () => resolve());
                child.kill("SIGTERM");
            }),
    };
}
