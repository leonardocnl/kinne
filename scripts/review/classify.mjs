// Risk classifier of the review bot (ADR 0009, docs/guides/review-bot.md).
//
// The pure functions decide the risk of a pull request from its changed paths and changed lines,
// using the rules in ./risk-rules.mjs. The model never takes part: the class is mechanical and
// fails closed (unknown path, missing diff, too many files, any API error: high).
//
// CLI (the review-bot workflow runs it from the BASE checkout, never from the pull request):
//   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER  required
//   GITHUB_OUTPUT, GITHUB_STEP_SUMMARY          written when set
// On any failure it exits non-zero after writing risk=high and eligible=false.

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { CONTENT_HIGH, HIGH, LOW, VISUAL } from "./risk-rules.mjs";

export const ALLOWED_AUTHORS = ["leonardocnl"];
export const AUTO_MERGE_BASE = "develop";

const RANK = { low: 0, visual: 1, high: 2 };
const TABLE_ROWS = 50;
const PER_PAGE = 100;
// The "list pull request files" endpoint returns at most 3000 files.
const MAX_FILES = 3000;
// `--- a/x`, `+++ b/x`, `--- /dev/null`: diff file headers, not changed content.
const FILE_HEADER = /^(\+\+\+|---) (a\/|b\/|\/dev\/null)/;

const highest = (risks) => risks.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "low");

/** @param {string} path */
export function classifyPath(path) {
    // Order is the precedence: the first list that matches wins (high, then visual, then low).
    for (const [risk, rules] of [
        ["high", HIGH],
        ["visual", VISUAL],
        ["low", LOW],
    ]) {
        const rule = rules.find((r) => r.pattern.test(path));
        if (rule) return { risk, why: rule.why };
    }
    return { risk: "high", why: "unclassified path" };
}

/** Reasons found in the added and removed lines of one file's patch. */
function contentReasons(path, patch) {
    const found = new Map();
    for (const line of patch.split("\n")) {
        if (!(line.startsWith("+") || line.startsWith("-"))) continue;
        if (FILE_HEADER.test(line)) continue;
        const text = line.slice(1);
        for (const rule of CONTENT_HIGH) {
            if (rule.pattern.test(text)) found.set(rule.why, true);
        }
    }
    return [...found.keys()].map((why) => ({ path, risk: "high", why: `changed line: ${why}` }));
}

/**
 * @param {Array<{filename: string, previous_filename?: string, status: string,
 *   changes?: number, patch?: string}>} files GitHub "list pull request files" objects
 */
export function classifyFiles(files) {
    if (!Array.isArray(files) || files.length === 0) {
        return { risk: "high", reasons: [{ path: "", risk: "high", why: "no files" }] };
    }
    const reasons = [];
    for (const file of files) {
        const paths = [file.filename, file.previous_filename].filter(Boolean);
        const pathReasons = paths.map((path) => ({ path, ...classifyPath(path) }));
        reasons.push(...pathReasons);

        if (typeof file.patch === "string") {
            reasons.push(...contentReasons(file.filename, file.patch));
            continue;
        }
        // GitHub omits the patch for large and binary files. Nothing to inspect: only a removed
        // file or a pure rename (no change at all) is safe to leave to its path.
        const pureRename = file.status === "renamed" && file.changes === 0;
        const pathRisk = highest(pathReasons.map((r) => r.risk));
        if (file.status !== "removed" && !pureRename && pathRisk === "low") {
            reasons.push({
                path: file.filename,
                risk: "high",
                why: "diff not available for inspection",
            });
        }
    }
    return { risk: highest(reasons.map((r) => r.risk)), reasons };
}

/**
 * The conditions of auto-merge that are known before the review. The review verdict, the checks
 * and the head commit are verified later, in the workflow.
 */
export function autoMergeEligible({ risk, baseRef, headRepo, baseRepo, author, draft }) {
    const blockers = [];
    if (risk !== "low") blockers.push(`risk is ${risk}, only low can be merged by the robot`);
    if (baseRef !== AUTO_MERGE_BASE) blockers.push(`base branch is not ${AUTO_MERGE_BASE}`);
    if (!headRepo || !baseRepo || headRepo.toLowerCase() !== baseRepo.toLowerCase()) {
        blockers.push("pull request is not from this repository");
    }
    if (!ALLOWED_AUTHORS.includes(String(author ?? "").toLowerCase())) {
        blockers.push("author is not allowed to auto-merge");
    }
    if (draft !== false) blockers.push("pull request is a draft");
    return { eligible: blockers.length === 0, blockers };
}

// Everything that comes from the pull request (paths, branch names) is escaped before it reaches
// the summary: it cannot end a table cell, open a link, a code span or an HTML tag.
export function escapeMarkdown(value) {
    return String(value)
        .replace(/[\r\n]+/g, " ")
        .replace(/&/g, "&amp;")
        .replace(/[<>`|\\[\]]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function renderSummary({ risk, eligible, blockers, reasons }) {
    const ordered = [...reasons].sort((a, b) => RANK[b.risk] - RANK[a.risk]);
    const shown = ordered.slice(0, TABLE_ROWS);
    const lines = [
        "## Review bot: risk classification",
        "",
        `Risk: **${risk}**. Auto-merge eligible before review: **${eligible ? "yes" : "no"}**.`,
        "",
    ];
    if (blockers.length > 0) {
        lines.push("Blockers:", "", ...blockers.map((b) => `- ${escapeMarkdown(b)}`), "");
    }
    lines.push("| Path | Class | Why |", "| --- | --- | --- |");
    for (const r of shown) {
        lines.push(`| ${escapeMarkdown(r.path)} | ${r.risk} | ${escapeMarkdown(r.why)} |`);
    }
    if (ordered.length > shown.length) {
        lines.push("", `${ordered.length - shown.length} more rows omitted (lowest classes last).`);
    }
    return lines.join("\n") + "\n";
}

class ClassificationError extends Error {}

function readEnv(env) {
    const token = env.GITHUB_TOKEN;
    const repo = env.GITHUB_REPOSITORY ?? "";
    const number = env.PR_NUMBER ?? "";
    if (!token) throw new ClassificationError("GITHUB_TOKEN is missing");
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo))
        throw new ClassificationError("invalid GITHUB_REPOSITORY");
    if (!/^\d+$/.test(number)) throw new ClassificationError("invalid PR_NUMBER");
    return { token, repo, number };
}

async function api(path, token, apiUrl) {
    const response = await fetch(`${apiUrl}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "kinne-review-bot",
        },
    });
    if (response.status !== 200) {
        throw new ClassificationError(`GitHub API answered ${response.status} for ${path}`);
    }
    try {
        return await response.json();
    } catch {
        throw new ClassificationError(`malformed JSON from ${path}`);
    }
}

const isString = (v) => typeof v === "string" && v.length > 0;

function readPullRequest(pr) {
    const valid =
        pr &&
        Number.isInteger(pr.changed_files) &&
        typeof pr.draft === "boolean" &&
        isString(pr.base?.ref) &&
        isString(pr.base?.repo?.full_name) &&
        isString(pr.user?.login);
    if (!valid) throw new ClassificationError("malformed pull request response");
    return {
        changedFiles: pr.changed_files,
        draft: pr.draft,
        baseRef: pr.base.ref,
        baseRepo: pr.base.repo.full_name,
        // null when the fork was deleted: never equal to the base repository
        headRepo: pr.head?.repo?.full_name ?? "",
        author: pr.user.login,
    };
}

async function listFiles(base, token, apiUrl) {
    const files = [];
    for (let page = 1; files.length < MAX_FILES; page++) {
        const batch = await api(`${base}/files?per_page=${PER_PAGE}&page=${page}`, token, apiUrl);
        if (!Array.isArray(batch)) throw new ClassificationError("malformed files response");
        for (const f of batch) {
            if (!isString(f?.filename) || !isString(f?.status)) {
                throw new ClassificationError("malformed file entry");
            }
        }
        files.push(...batch);
        if (batch.length < PER_PAGE) break;
    }
    return files;
}

export async function run(env = process.env) {
    const { token, repo, number } = readEnv(env);
    const apiUrl = env.GITHUB_API_URL || "https://api.github.com";
    const base = `/repos/${repo}/pulls/${number}`;
    const pr = readPullRequest(await api(base, token, apiUrl));
    const files = await listFiles(base, token, apiUrl);

    const result =
        files.length < pr.changedFiles
            ? {
                  risk: "high",
                  reasons: [{ path: "", risk: "high", why: "too many files to list" }],
              }
            : classifyFiles(files);
    const { eligible, blockers } = autoMergeEligible({
        risk: result.risk,
        baseRef: pr.baseRef,
        headRepo: pr.headRepo,
        baseRepo: pr.baseRepo,
        author: pr.author,
        draft: pr.draft,
    });
    return { ...result, eligible, blockers };
}

async function main() {
    const write = (file, text) => file && appendFileSync(file, text);
    try {
        const out = await run();
        write(process.env.GITHUB_OUTPUT, `risk=${out.risk}\neligible=${out.eligible}\n`);
        const summary = renderSummary(out);
        write(process.env.GITHUB_STEP_SUMMARY, summary);
        process.stdout.write(`risk=${out.risk} eligible=${out.eligible}\n`);
    } catch (error) {
        // Fail closed: the workflow also treats a failed step as high.
        write(process.env.GITHUB_OUTPUT, "risk=high\neligible=false\n");
        const message = error instanceof ClassificationError ? error.message : "unexpected error";
        process.stderr.write(`::error::classification failed: ${message}\n`);
        process.exitCode = 1;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
