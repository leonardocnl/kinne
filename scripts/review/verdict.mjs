// Validates the reviewer's verdict file and renders the review the workflow posts.
//
// The model only writes a JSON file. This code, which involves no model, decides whether the file
// is valid and what review is posted. Anything missing or malformed becomes a COMMENT review that
// says the review could not be completed: never an approval. A critical or high finding forces
// request_changes whatever the verdict field says.
//
// CLI (run from the BASE checkout by the review-bot workflow):
//   VERDICT_FILE, HEAD_SHA, REVIEW_PAYLOAD, SUMMARY_FILE  required
//   GITHUB_OUTPUT                                         written when set (valid, approve)
// REVIEW_PAYLOAD receives the body of the POST /pulls/{n}/reviews request.

import { appendFileSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const MAX_FILE_BYTES = 200 * 1024;
// GitHub rejects review bodies of 65536 characters or more.
export const MAX_BODY_CHARS = 60000;
const MAX_FINDINGS = 100;
const MAX_TEXT = 4000;
const SEVERITIES = ["critical", "high", "medium", "low"];
const VERDICTS = ["approve", "request_changes"];
const FINDING_KEYS = ["severity", "path", "line", "problem", "fix"];

const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const hasExactKeys = (obj, keys) =>
    Object.keys(obj).length === keys.length && keys.every((k) => k in obj);

/** @param {string} text the content of the verdict file */
export function validateVerdict(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        return { ok: false, reason: "the verdict file is not valid JSON" };
    }
    if (!isObject(data) || !hasExactKeys(data, ["verdict", "summary", "findings"])) {
        return { ok: false, reason: "the verdict file has the wrong shape" };
    }
    if (!VERDICTS.includes(data.verdict)) return { ok: false, reason: "unknown verdict value" };
    if (typeof data.summary !== "string") return { ok: false, reason: "summary is not a string" };
    if (!Array.isArray(data.findings) || data.findings.length > MAX_FINDINGS) {
        return { ok: false, reason: "findings is not a list of at most 100 entries" };
    }
    for (const f of data.findings) {
        const valid =
            isObject(f) &&
            hasExactKeys(f, FINDING_KEYS) &&
            SEVERITIES.includes(f.severity) &&
            typeof f.path === "string" &&
            (f.line === null || (Number.isInteger(f.line) && f.line > 0)) &&
            typeof f.problem === "string" &&
            typeof f.fix === "string";
        if (!valid) return { ok: false, reason: "a finding has the wrong shape" };
    }
    const blocking = data.findings.some((f) => f.severity === "critical" || f.severity === "high");
    return {
        ok: true,
        // forced: a blocking finding cannot be approved
        verdict: blocking ? "request_changes" : data.verdict,
        summary: data.summary,
        findings: data.findings,
    };
}

// Model text can come from untrusted content. Entities stop HTML and links; `@` stops mentions.
export function escapeText(value, max = MAX_TEXT) {
    const text = String(value).slice(0, max);
    return text.replace(/[&<>[\]@]/g, (c) => `&#${c.charCodeAt(0)};`);
}

const cap = (body) =>
    body.length <= MAX_BODY_CHARS
        ? body
        : `${body.slice(0, MAX_BODY_CHARS)}\n\n_Review truncated: it exceeded the size limit._`;

/** The request body for POST /repos/{owner}/{repo}/pulls/{n}/reviews. */
export function buildReview(result, sha) {
    const short = sha.slice(0, 7);
    if (!result.ok) {
        return {
            commit_id: sha,
            event: "COMMENT",
            body: `The automated review could not be completed for \`${short}\`: ${result.reason}. No approval was given.`,
        };
    }
    const order = Object.fromEntries(SEVERITIES.map((s, i) => [s, i]));
    const findings = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity]);
    const lines = [
        `## Automated review of \`${short}\``,
        "",
        `Verdict: **${result.verdict === "approve" ? "approve" : "request changes"}**`,
        "",
        escapeText(result.summary),
    ];
    if (findings.length > 0) lines.push("", "### Findings");
    for (const f of findings) {
        const where =
            f.line === null ? escapeText(f.path, 300) : `${escapeText(f.path, 300)}:${f.line}`;
        lines.push(
            "",
            `- **${f.severity}** \`${where.replace(/`/g, "'")}\``,
            `  - Problem: ${escapeText(f.problem).replace(/\n+/g, " ")}`,
            `  - Fix: ${escapeText(f.fix).replace(/\n+/g, " ")}`,
        );
    }
    return {
        commit_id: sha,
        event: result.verdict === "approve" ? "APPROVE" : "REQUEST_CHANGES",
        body: cap(lines.join("\n")),
    };
}

/** Reads the verdict file; a missing, oversized or non-regular file is invalid, not an error. */
export function readVerdictFile(path) {
    let stat;
    try {
        stat = lstatSync(path);
    } catch {
        return { ok: false, reason: "the reviewer did not write a verdict file" };
    }
    if (!stat.isFile()) return { ok: false, reason: "the verdict path is not a regular file" };
    if (stat.size > MAX_FILE_BYTES) return { ok: false, reason: "the verdict file is too large" };
    return validateVerdict(readFileSync(path, "utf8"));
}

function main(env = process.env) {
    const sha = env.HEAD_SHA ?? "";
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("invalid HEAD_SHA");
    const result = readVerdictFile(env.VERDICT_FILE ?? "");
    const review = buildReview(result, sha);
    writeFileSync(env.REVIEW_PAYLOAD, JSON.stringify(review));
    writeFileSync(
        env.SUMMARY_FILE,
        result.ok ? escapeText(result.summary, 1000).replace(/\s+/g, " ") : "",
    );
    const approve = result.ok && review.event === "APPROVE";
    if (env.GITHUB_OUTPUT) {
        appendFileSync(env.GITHUB_OUTPUT, `valid=${result.ok}\napprove=${approve}\n`);
    }
    process.stdout.write(`valid=${result.ok} event=${review.event}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        main();
    } catch {
        // No payload means nothing is posted and nothing is approved.
        process.stderr.write("::error::verdict validation crashed\n");
        process.exitCode = 1;
    }
}
