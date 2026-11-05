import path from "node:path";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Plan §1.6 rule 5: a "use client" file never imports server code (server-only, database, auth,
// TMDB, configuration with secrets). ESLint selects files by name, not by directive, so this small
// local rule reads the directive. It sees direct imports only; anything deeper still breaks the
// build through `server-only`.
const SERVER_PACKAGES = /^(server-only|drizzle-orm|@neondatabase\/serverless)(\/|$)/;
const SERVER_PATHS = [
    /^src\/(.+\/)?infrastructure\/(db|auth|tmdb)(\/|\.|$)/,
    /^src\/shared\/config(\/|\.|$)/,
];

/** The import as a repo-relative path ("src/..."), or null for a package. */
function repoPath(specifier, filename, cwd) {
    if (specifier.startsWith("@/")) return `src/${specifier.slice(2)}`;
    if (!specifier.startsWith(".")) return null;
    const absolute = path.resolve(path.dirname(filename), specifier);
    return path.relative(cwd, absolute).split(path.sep).join("/");
}

const clientServerImports = {
    meta: {
        type: "problem",
        messages: {
            server: '"use client" file imports server code ({{ source }}); use a server action.',
        },
        schema: [],
    },
    create(context) {
        const isClient = context.sourceCode.ast.body.some(
            (node) => node.type === "ExpressionStatement" && node.directive === "use client",
        );
        if (!isClient) return {};
        const check = (source) => {
            if (!source || source.type !== "Literal" || typeof source.value !== "string") return;
            const specifier = source.value;
            const local = repoPath(specifier, context.filename, context.cwd);
            const server =
                local === null
                    ? SERVER_PACKAGES.test(specifier)
                    : SERVER_PATHS.some((pattern) => pattern.test(local));
            if (server)
                context.report({ node: source, messageId: "server", data: { source: specifier } });
        };
        return {
            ImportDeclaration: (node) => check(node.source),
            ExportNamedDeclaration: (node) => check(node.source),
            ExportAllDeclaration: (node) => check(node.source),
            ImportExpression: (node) => check(node.source),
        };
    },
};

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Desliga regras de formatação que conflitam com o Prettier; deve vir depois das configs do Next.
    prettier,
    // security.md §6: nada de dangerouslySetInnerHTML (texto do TMDB é sempre texto)
    // (os mesmos arquivos em que o eslint-config-next registra o plugin react; .cjs fica de fora)
    { files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"], rules: { "react/no-danger": "error" } },
    {
        files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
        plugins: { kinne: { rules: { "client-server-imports": clientServerImports } } },
        rules: {
            "kinne/client-server-imports": "error",
            // security.md §6: no console output in production; server logs say so on the line
            "no-console": "error",
            eqeqeq: ["error", "always"],
        },
    },
    {
        files: ["**/*.{ts,tsx,mts,cts}"],
        rules: {
            // `typeof import("./x")` stays allowed: tests type modules they import after vi.mock
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { disallowTypeAnnotations: false },
            ],
        },
    },
    // Command-line scripts, tests and the browser test harness print on purpose.
    {
        files: ["scripts/**", "e2e/**", "**/*.test.{ts,tsx}", "src/test/**"],
        rules: { "no-console": "off" },
    },
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
]);

export default eslintConfig;
