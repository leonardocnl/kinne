import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Runs the real eslint.config.mjs on snippets: client code never imports server code (plan §1.6
// rule 5), and the F1 rules (no-console, eqeqeq) are on.
const eslint = new ESLint();
const CLIENT = "src/app/_components/home/Probe.tsx";
const SERVER = "src/app/_data/probe.ts";

async function rules(code: string, filePath: string): Promise<string[]> {
    const [result] = await eslint.lintText(code, { filePath });
    return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId ?? "parse");
}
const client = (body: string) => rules(`"use client";\n${body}\nexport const x = 1;\n`, CLIENT);

describe("client code never imports server code", () => {
    it.each([
        'import "server-only";',
        'import { createDb } from "@/infrastructure/db/client";',
        'import { session } from "@/infrastructure/auth/session";',
        'import { tmdb } from "../../../infrastructure/tmdb/catalog-source";',
        'import { sql } from "drizzle-orm";',
        'import { neon } from "@neondatabase/serverless";',
        'import { users } from "@/modules/accounts/infrastructure/db/schema";',
        'import { config } from "@/shared/config";',
        'export { createDb } from "@/infrastructure/db/client";',
        'export const load = () => import("@/infrastructure/tmdb/client");',
    ])("refuses %s", async (line) => {
        expect(await client(line)).toContain("kinne/client-server-imports");
    });

    it.each([
        'import { requestCode } from "@/app/_actions/account";',
        'import { readStored } from "@/infrastructure/browser-storage";',
        'import { KINNE_GENRES } from "@/domain/genre";',
        'import { useState } from "react";',
    ])("allows %s", async (line) => {
        expect(await client(line)).toEqual([]);
    });

    it("server code may import the database", async () => {
        const code =
            'import { createDb } from "@/infrastructure/db/client";\nexport const x = createDb;\n';
        expect(await rules(code, SERVER)).toEqual([]);
    });
});

describe("F1 rules", () => {
    it("no console output, even in client code", async () => {
        expect(await client('console.log("x");')).toContain("no-console");
    });

    it("strict equality", async () => {
        expect(await client("export const same = (a: unknown, b: unknown) => a == b;")).toContain(
            "eqeqeq",
        );
    });

    it("type-only imports use import type", async () => {
        const code = 'import { SQL } from "drizzle-orm";\nexport type Q = SQL;\n';
        expect(await rules(code, SERVER)).toContain("@typescript-eslint/consistent-type-imports");
    });
});
