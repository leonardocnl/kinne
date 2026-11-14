import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    buildReview,
    escapeText,
    MAX_BODY_CHARS,
    MAX_FILE_BYTES,
    readVerdictFile,
    validateVerdict,
} from "./verdict.mjs";

const SHA = "a".repeat(40);
const finding = (extra: Record<string, unknown> = {}) => ({
    severity: "low",
    path: "src/domain/x.ts",
    line: 3,
    problem: "p",
    fix: "f",
    ...extra,
});
const verdict = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ verdict: "approve", summary: "ok", findings: [], ...extra });

describe("validateVerdict", () => {
    it("accepts a clean approval", () => {
        expect(validateVerdict(verdict())).toMatchObject({ ok: true, verdict: "approve" });
    });

    it("accepts an approval with only medium and low findings", () => {
        const text = verdict({ findings: [finding({ severity: "medium", line: null })] });
        expect(validateVerdict(text)).toMatchObject({ ok: true, verdict: "approve" });
    });

    it.each(["critical", "high"])("forces request_changes on a %s finding", (severity) => {
        const out = validateVerdict(verdict({ findings: [finding({ severity })] }));
        expect(out).toMatchObject({ ok: true, verdict: "request_changes" });
    });

    it.each([
        ["not JSON", "approve"],
        ["an array", "[]"],
        ["a missing key", JSON.stringify({ verdict: "approve", summary: "x" })],
        ["an extra key", verdict({ extra: 1 })],
        ["an unknown verdict", verdict({ verdict: "merge" })],
        ["a non-string summary", verdict({ summary: 1 })],
        ["findings not a list", verdict({ findings: {} })],
        ["a finding with a bad severity", verdict({ findings: [finding({ severity: "huge" })] })],
        ["a finding with a string line", verdict({ findings: [finding({ line: "3" })] })],
        ["a finding with line 0", verdict({ findings: [finding({ line: 0 })] })],
        ["a finding with a number problem", verdict({ findings: [finding({ problem: 1 })] })],
        ["a finding with an extra key", verdict({ findings: [finding({ more: 1 })] })],
        ["too many findings", verdict({ findings: Array.from({ length: 101 }, () => finding()) })],
    ])("rejects %s", (_name, text) => {
        expect(validateVerdict(text).ok).toBe(false);
    });
});

describe("readVerdictFile", () => {
    const dir = mkdtempSync(join(tmpdir(), "verdict-"));

    it("rejects a missing file", () => {
        expect(readVerdictFile(join(dir, "none.json")).ok).toBe(false);
    });

    it("rejects a file over the size cap", () => {
        const path = join(dir, "big.json");
        writeFileSync(path, verdict({ summary: "x".repeat(MAX_FILE_BYTES) }));
        expect(readVerdictFile(path)).toMatchObject({ ok: false });
    });

    it("rejects a directory and a symlink", () => {
        mkdirSync(join(dir, "d"));
        expect(readVerdictFile(join(dir, "d")).ok).toBe(false);
        writeFileSync(join(dir, "real.json"), verdict());
        symlinkSync(join(dir, "real.json"), join(dir, "link.json"));
        expect(readVerdictFile(join(dir, "link.json")).ok).toBe(false);
    });

    it("reads a valid file", () => {
        writeFileSync(join(dir, "ok.json"), verdict());
        expect(readVerdictFile(join(dir, "ok.json")).ok).toBe(true);
    });
});

describe("buildReview", () => {
    it("never approves an invalid verdict: it posts a COMMENT", () => {
        const review = buildReview(validateVerdict("nope"), SHA);
        expect(review.event).toBe("COMMENT");
        expect(review.commit_id).toBe(SHA);
        expect(review.body).toContain("could not be completed");
    });

    it("maps the verdict to the review event and pins the commit", () => {
        expect(buildReview(validateVerdict(verdict()), SHA)).toMatchObject({
            event: "APPROVE",
            commit_id: SHA,
        });
        const blocked = validateVerdict(verdict({ findings: [finding({ severity: "high" })] }));
        expect(buildReview(blocked, SHA).event).toBe("REQUEST_CHANGES");
    });

    it("escapes model text so it cannot inject HTML, links or mentions", () => {
        const evil = "<img src=x onerror=1> [a](http://e) @owner";
        const text = verdict({ summary: evil, findings: [finding({ problem: evil, fix: evil })] });
        const { body } = buildReview(validateVerdict(text), SHA);
        expect(body).not.toMatch(/<img|\]\(|@owner/);
        expect(escapeText("a&b")).toBe("a&#38;b");
    });

    it("keeps the body under the limit of GitHub", () => {
        const findings = Array.from({ length: 100 }, () => finding({ problem: "x".repeat(3000) }));
        const { body } = buildReview(validateVerdict(verdict({ findings })), SHA);
        expect(body.length).toBeLessThan(65536);
        expect(body.length).toBeLessThanOrEqual(MAX_BODY_CHARS + 100);
    });
});
