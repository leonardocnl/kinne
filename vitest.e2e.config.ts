import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Testes que sobem o app construído (`npm run build` antes). Fora do `npm test` de propósito.
export default mergeConfig(
    base,
    defineConfig({
        test: {
            include: ["e2e/**/*.e2e.ts"],
            testTimeout: 60_000,
            hookTimeout: 60_000,
            fileParallelism: false,
        },
    }),
);
