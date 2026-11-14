// Risk classification rules of ADR 0009 (docs/architecture/adr/0009-review-and-auto-merge.md).
// This file is the only place where the path list lives. It is security code: a pull request that
// changes it is high risk, and a pull request is always classified by the version on its base
// branch.
//
// How the classifier reads it (scripts/review/classify.mjs):
//   - every changed path is tested against all three lists, and a renamed file counts under both
//     its old and its new path;
//   - a path gets the highest class that matches it: high, then visual, then low;
//   - a path that matches nothing is high ("unclassified"): the lists fail closed;
//   - the pull request gets the highest class among its paths;
//   - a changed line that matches CONTENT_HIGH makes the pull request high, wherever the file is.
//
// Paths are relative to the repository root, with forward slashes.

/** Only the owner merges. Listed for the reason shown in the summary and to override LOW. */
export const HIGH = [
    // Accounts: sign-in, session, personal data.
    { pattern: /^src\/modules\/accounts\//, why: "accounts module" },
    { pattern: /^src\/infrastructure\/auth\//, why: "authentication" },
    { pattern: /^src\/.*account/i, why: "accounts code" },
    { pattern: /^src\/app\/(entrar|perfil|boas-vindas)\//, why: "sign-in, profile and onboarding" },

    // Security: trust boundaries, headers, limits.
    { pattern: /^src\/app\/(_actions|_data|api|\[secret\])\//, why: "server entry point" },
    { pattern: /(^|\/)(route|proxy|middleware)\.[cm]?[jt]s$/, why: "route handler or proxy" },
    { pattern: /^src\/infrastructure\//, why: "infrastructure: database, secrets, network" },
    { pattern: /^src\/modules\/[^/]+\/infrastructure\//, why: "module infrastructure" },
    { pattern: /rate-?limit|limiter/i, why: "rate limiting" },
    { pattern: /security-headers|(^|[/.-])csp([/.-]|$)/i, why: "CSP and security headers" },
    { pattern: /^src\/shared\/(config|logger)\//, why: "configuration and logging" },
    { pattern: /^src\/test\//, why: "test guards" },
    { pattern: /^e2e\/(?!visual-baseline\/)/, why: "end-to-end security tests" },
    { pattern: /^docs\/security\.md$/, why: "security rules" },
    { pattern: /^docs\/threats\//, why: "threat analyses" },

    // Database: schema, migrations, anything that decides what runs against a database.
    { pattern: /^drizzle(\/|\.config\.)/, why: "migrations" },
    { pattern: /(^|\/)schema\.[cm]?[jt]s$/, why: "table definitions" },
    { pattern: /(^|\/)db\//, why: "database code" },
    { pattern: /migrat/i, why: "migrations" },

    // Configuration, CI, dependencies.
    // Every root file except the readme (low) and the design rules (visual).
    {
        pattern: /^(?!README\.md$|DESIGN(\.[A-Za-z-]+)?\.md$)[^/]+$/,
        why: "root file: configuration, dependencies or rules",
    },
    { pattern: /(^|\/)\.env/, why: "environment" },
    { pattern: /^\.github\//, why: "CI and repository settings" },
    { pattern: /(^|\/)(package(-lock)?\.json|[^/]*requirements[^/]*\.txt)$/, why: "dependencies" },
    { pattern: /^scripts\//, why: "scripts run by CI, hooks and jobs" },

    // The rules themselves.
    { pattern: /^\.claude\//, why: "agent rules" },
    { pattern: /^\.githooks\//, why: "git hooks" },
    { pattern: /^docs\/architecture\//, why: "architecture rules and ADRs" },
    { pattern: /^docs\/requisitos\//, why: "requirements" },
    { pattern: /^docs\/operations\//, why: "operations and branch rulesets" },
    { pattern: /^docs\/(plano-fundacao|release-checklist)\.md$/, why: "plan and release process" },
    { pattern: /^docs\/guides\/review-bot\.md$/, why: "review bot setup" },
];

/** Only the owner merges: anything a person sees. */
export const VISUAL = [
    { pattern: /^DESIGN(\.[A-Za-z-]+)?\.md$/, why: "design rules" },
    { pattern: /\.(tsx|jsx|css)$/, why: "component or style" },
    { pattern: /\.(svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf)$/i, why: "image or font" },
    { pattern: /^public\//, why: "public asset" },
    { pattern: /^src\/shared\/ui\//, why: "design system" },
    { pattern: /^src\/modules\/[^/]+\/ui\//, why: "module UI" },
    { pattern: /^src\/app\/_components\//, why: "components" },
    { pattern: /^docs\/design\//, why: "approved mock-up and design notes" },
    { pattern: /^e2e\/visual-baseline\//, why: "approved screenshots" },
];

/** The closed list: only these paths can be merged by the robot. */
export const LOW = [
    { pattern: /^README\.md$/, why: "readme" },
    { pattern: /^src\/([^/]+\/)*README\.md$/, why: "layer or module readme" },
    { pattern: /^docs\/.+\.(md|dot)$/, why: "documentation" },
    { pattern: /^docs\/generated\//, why: "generated documentation" },
    { pattern: /^src\/(domain|application)\/.+\.ts$/, why: "pure rules and use cases" },
    {
        pattern: /^src\/modules\/[^/]+\/(domain|application)\/.+\.ts$/,
        why: "module rules and use cases",
    },
    { pattern: /^src\/modules\/[^/]+\/index\.ts$/, why: "module public API" },
    { pattern: /^src\/shared\/(events|lib)\/.+\.ts$/, why: "shared library" },
];

/**
 * Changed lines (added or removed) that make a pull request high risk in any file:
 * input validation, the client/server split, secrets and environment, and suppressed checks.
 */
export const CONTENT_HIGH = [
    { pattern: /server-only|["']use server["']/, why: "client/server boundary" },
    { pattern: /\bzod\b|\bz\.[A-Za-z]+\(/, why: "input validation" },
    { pattern: /process\.env|NEXT_PUBLIC_/, why: "environment and secrets" },
    { pattern: /dangerouslySetInnerHTML/, why: "raw HTML" },
    { pattern: /\b(cookies|headers)\(\)/, why: "cookies and headers" },
    { pattern: /eslint-disable|@ts-(ignore|expect-error|nocheck)/, why: "suppressed check" },
    { pattern: /\b(it|test|describe)\.(skip|only|todo)\b/, why: "disabled test" },
];
