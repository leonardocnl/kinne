// Boundary rules of docs/plano-fundacao.md §1.6, checked by `npm run arch:check`.
// Rule 5 (client code never imports server code) is in eslint.config.mjs: it needs the
// "use client" directive, which this tool does not see.

// Table 1.2: the business modules each module may import (through its index.ts).
const ALLOWED_MODULE_DEPS = {
    catalog: [],
    taste: ["catalog"],
    discovery: ["taste", "catalog", "accounts"],
    room: ["taste", "catalog"],
    accounts: [],
    analytics: [],
    library: ["catalog", "taste", "accounts"],
};

const moduleDirectionRules = Object.entries(ALLOWED_MODULE_DEPS).map(([name, allowed]) => ({
    name: `module-direction-${name}`,
    comment: `${name} may import only ${allowed.join(", ") || "no other business module"} (table 1.2)`,
    severity: "error",
    from: { path: `^src/modules/${name}/` },
    to: {
        path: "^src/modules/[^/]+/",
        pathNot: [`^src/modules/(${[name, ...allowed].join("|")})/`],
    },
}));

const FRAMEWORK = "(^|/)node_modules/(next|react|react-dom)/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        // 1. Between modules: only through the other module's index.ts.
        {
            name: "module-public-api",
            comment: "Import another module only through its index.ts (rule 1)",
            severity: "error",
            from: { path: "^src/modules/([^/]+)/" },
            to: {
                path: "^src/modules/[^/]+/",
                pathNot: ["^src/modules/$1/", "^src/modules/[^/]+/index\\.ts$"],
            },
        },
        // 2. Direction of dependencies (table 1.2).
        ...moduleDirectionRules,
        // 3. No cycles.
        {
            name: "no-circular",
            comment: "No dependency cycles (rule 3)",
            severity: "error",
            from: { path: "^src/" },
            to: { circular: true },
        },
        // 4. Layers inside a module.
        {
            name: "module-domain-pure",
            comment: "domain imports no application, infrastructure or ui of its module (rule 4)",
            severity: "error",
            from: { path: "^src/modules/([^/]+)/domain/" },
            to: { path: "^src/modules/$1/(application|infrastructure|ui)/" },
        },
        {
            name: "module-domain-no-framework",
            comment: "domain imports neither next nor react (rule 4)",
            severity: "error",
            from: { path: "^src/modules/[^/]+/domain/" },
            to: { path: FRAMEWORK },
        },
        {
            name: "module-application-no-outer",
            comment: "application imports no infrastructure or ui of its module (rule 4)",
            severity: "error",
            from: { path: "^src/modules/([^/]+)/application/" },
            to: { path: "^src/modules/$1/(infrastructure|ui)/" },
        },
        // 6. A module reads only its own tables.
        {
            name: "module-own-tables",
            comment: "Only the module's own code imports its table definitions (rule 6)",
            severity: "error",
            from: { path: "^src/modules/([^/]+)/" },
            to: {
                path: "^src/modules/[^/]+/infrastructure/db/schema\\.ts$",
                pathNot: "^src/modules/$1/",
            },
        },
        {
            name: "module-index-hides-tables",
            comment: "index.ts never re-exports the tables, so rule 6 cannot be bypassed",
            severity: "error",
            from: { path: "^src/modules/[^/]+/index\\.ts$" },
            to: { path: "^src/modules/[^/]+/infrastructure/db/schema\\.ts$" },
        },
        // 7. shared imports no module; neither shared nor a module imports the routes.
        {
            name: "shared-no-modules",
            comment: "shared imports no business module (rule 7)",
            severity: "error",
            from: { path: "^src/shared/" },
            to: { path: "^src/modules/" },
        },
        {
            name: "no-routes-from-below",
            comment: "src/app only calls modules and shared; nothing below imports it (§1.1)",
            severity: "error",
            from: { path: "^src/(modules|shared)/" },
            to: { path: "^src/app/" },
        },

        // Current layout (src/domain, src/application, ...) until F2 moves it into modules.
        // Remove these after the last module migrates.
        {
            name: "legacy-domain-pure",
            comment: "src/domain imports no application, infrastructure or app",
            severity: "error",
            from: { path: "^src/domain/" },
            to: { path: "^src/(application|infrastructure|app)/" },
        },
        {
            name: "legacy-domain-no-framework",
            comment: "src/domain imports neither next nor react",
            severity: "error",
            from: { path: "^src/domain/" },
            to: { path: FRAMEWORK },
        },
        {
            name: "legacy-application-no-outer",
            comment: "src/application imports no infrastructure or app",
            severity: "error",
            from: { path: "^src/application/" },
            to: { path: "^src/(infrastructure|app)/" },
        },

        {
            name: "not-to-unresolvable",
            comment: "Every import resolves",
            severity: "error",
            from: {},
            to: { couldNotResolve: true },
        },
    ],
    options: {
        doNotFollow: { path: "node_modules" },
        // type-only imports cross boundaries too
        tsPreCompilationDeps: true,
        tsConfig: { fileName: "tsconfig.json" },
        enhancedResolveOptions: {
            exportsFields: ["exports"],
            conditionNames: ["import", "require", "node", "default", "types"],
            mainFields: ["module", "main", "types", "typings"],
        },
        reporterOptions: {
            dot: {
                // one node per layer or route folder, so the diagram stays readable
                collapsePattern: "^src/(modules/[^/]+/[^/]+|shared/[^/]+|app/[^/]+|[^/]+)",
            },
        },
    },
};
