import { describe, expect, it } from "vitest";
import {
    autoMergeEligible,
    classifyFiles,
    classifyPath,
    escapeMarkdown,
    renderSummary,
} from "./classify.mjs";

const file = (filename: string, extra: Record<string, unknown> = {}) => ({
    filename,
    status: "modified",
    changes: 1,
    patch: "@@ -1 +1 @@\n-a\n+b",
    ...extra,
});

describe("classifyPath", () => {
    it("classifies one path of each class", () => {
        expect(classifyPath("package.json").risk).toBe("high");
        expect(classifyPath("src/shared/ui/Button.tsx").risk).toBe("visual");
        expect(classifyPath("src/domain/pick.ts").risk).toBe("low");
    });

    it("treats an unknown path as high", () => {
        expect(classifyPath("some/new/folder/file.ts")).toEqual({
            risk: "high",
            why: "unclassified path",
        });
    });

    it.each(["src/application/accounts.ts", "src/domain/rate-limit.ts", "docs/security.md"])(
        "lets high win over low on %s",
        (path) => {
            expect(classifyPath(path).risk).toBe("high");
        },
    );
});

// Real paths of this repository (hardcoded: the test must not depend on git).
describe("classifyPath on real paths", () => {
    it.each([
        ["package.json", "high"],
        [".github/workflows/ci.yml", "high"],
        ["CLAUDE.md", "high"],
        ["DESIGN.md", "visual"],
        ["README.md", "low"],
        ["src/app/globals.css", "visual"],
        ["src/app/_components/home/FiltersPanel.tsx", "visual"],
        ["src/app/_actions/filters.ts", "high"],
        ["src/app/_actions/filters.test.ts", "high"],
        ["src/infrastructure/db/schema.ts", "high"],
        ["drizzle/0011_accounts.sql", "high"],
        ["src/domain/genre-conflicts.ts", "low"],
        ["src/domain/genre-conflicts.test.ts", "low"],
        ["src/application/daily-picks.ts", "low"],
        ["docs/baseline.md", "low"],
        ["docs/architecture/adr/0001-modular-monolith.md", "high"],
        ["docs/design/taste-graph.md", "visual"],
        ["scripts/review/risk-rules.mjs", "high"],
        ["e2e/visual-baseline/x.png", "visual"],
        ["public/grain.svg", "visual"],
        ["src/modules/accounts/domain/session.ts", "high"],
        ["src/modules/catalog/domain/title.ts", "low"],
        ["src/modules/catalog/ui/Card.tsx", "visual"],
        ["src/modules/catalog/infrastructure/db/schema.ts", "high"],
        ["some/new/folder/file.ts", "high"],
    ])("%s is %s", (path, risk) => {
        expect(classifyPath(path).risk).toBe(risk);
    });
});

describe("classifyFiles", () => {
    it("takes the highest class among the files", () => {
        const out = classifyFiles([file("docs/a.md"), file("src/shared/ui/B.tsx")]);
        expect(out.risk).toBe("visual");
        expect(classifyFiles([file("docs/a.md")]).risk).toBe("low");
        expect(classifyFiles([file("docs/a.md"), file("package.json")]).risk).toBe("high");
    });

    it("counts a rename under the old and the new path", () => {
        const out = classifyFiles([
            file("docs/moved.md", { status: "renamed", previous_filename: "docs/security.md" }),
        ]);
        expect(out.risk).toBe("high");
        expect(out.reasons.map((r) => r.path)).toContain("docs/security.md");
    });

    it("flags a changed line that matches a content rule, in a low file", () => {
        const out = classifyFiles([
            file("src/domain/x.ts", { patch: '@@ -1,2 +1 @@\n import a\n-import "server-only";' }),
        ]);
        expect(out.risk).toBe("high");
        expect(out.reasons).toContainEqual({
            path: "src/domain/x.ts",
            risk: "high",
            why: "changed line: client/server boundary",
        });
    });

    it("ignores context lines and diff headers", () => {
        const patch =
            "--- a/src/domain/x.ts\n+++ b/src/domain/x.ts\n@@ -1 +1 @@\n server-only\n-a\n+b";
        expect(classifyFiles([file("src/domain/x.ts", { patch })]).risk).toBe("low");
    });

    it("still reads a removed line that starts with dashes", () => {
        const patch = "@@ -1 +1 @@\n--- eslint-disable\n+b";
        expect(classifyFiles([file("src/domain/x.ts", { patch })]).risk).toBe("high");
    });

    it("treats a modified low file without a patch as high", () => {
        const out = classifyFiles([file("docs/big.md", { patch: undefined })]);
        expect(out.risk).toBe("high");
        expect(out.reasons.at(-1)?.why).toBe("diff not available for inspection");
    });

    it("leaves a removed low file without a patch as low", () => {
        const out = classifyFiles([file("docs/old.md", { status: "removed", patch: undefined })]);
        expect(out.risk).toBe("low");
    });

    it("leaves a pure rename between low paths as low, but not a rename with changes", () => {
        const pure = file("docs/b.md", {
            status: "renamed",
            previous_filename: "docs/a.md",
            changes: 0,
            patch: undefined,
        });
        expect(classifyFiles([pure]).risk).toBe("low");
        expect(classifyFiles([{ ...pure, changes: 3 }]).risk).toBe("high");
    });

    it("keeps a rename from a high path to a low path high", () => {
        const out = classifyFiles([
            file("docs/b.md", {
                status: "renamed",
                previous_filename: "docs/operations/a.md",
                changes: 0,
                patch: undefined,
            }),
        ]);
        expect(out.risk).toBe("high");
    });

    it("treats an empty list as high", () => {
        expect(classifyFiles([])).toEqual({
            risk: "high",
            reasons: [{ path: "", risk: "high", why: "no files" }],
        });
    });
});

describe("autoMergeEligible", () => {
    const ok = {
        risk: "low",
        baseRef: "develop",
        headRepo: "leonardocnl/kinne",
        baseRepo: "leonardocnl/kinne",
        author: "leonardocnl",
        draft: false,
    };

    it("accepts a low risk pull request of the owner into develop", () => {
        expect(autoMergeEligible(ok)).toEqual({ eligible: true, blockers: [] });
    });

    it.each([
        ["base is main", { baseRef: "main" }],
        ["a fork", { headRepo: "someone/kinne" }],
        ["a deleted fork", { headRepo: "" }],
        ["another author", { author: "dependabot[bot]" }],
        ["a draft", { draft: true }],
        ["visual risk", { risk: "visual" }],
        ["high risk", { risk: "high" }],
    ])("blocks %s", (_name, change) => {
        const out = autoMergeEligible({ ...ok, ...change });
        expect(out.eligible).toBe(false);
        expect(out.blockers).toHaveLength(1);
    });
});

describe("summary", () => {
    it("escapes what a pull request controls", () => {
        const evil = "a|b`c<img src=x onerror=1>\n[x](http://e)";
        const out = escapeMarkdown(evil);
        expect(out).not.toMatch(/[|`<>[\]\n]/);
        const summary = renderSummary({
            risk: "high",
            eligible: false,
            blockers: [evil],
            reasons: [{ path: evil, risk: "high", why: evil }],
        });
        const row = summary.split("\n").find((l) => l.startsWith("| a"));
        expect(row?.split("|")).toHaveLength(5);
        expect(summary).not.toContain("<img");
    });

    it("caps the table and says how many rows were omitted", () => {
        const reasons = Array.from({ length: 60 }, (_, i) => ({
            path: `docs/${i}.md`,
            risk: "low",
            why: "documentation",
        }));
        const summary = renderSummary({ risk: "low", eligible: true, blockers: [], reasons });
        expect(summary.split("\n").filter((l) => l.startsWith("| docs/"))).toHaveLength(50);
        expect(summary).toContain("10 more rows omitted");
    });
});
