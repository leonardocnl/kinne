import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Desliga regras de formatação que conflitam com o Prettier; deve vir depois das configs do Next.
    prettier,
    // security.md §6: nada de dangerouslySetInnerHTML (texto do TMDB é sempre texto)
    // (os mesmos arquivos em que o eslint-config-next registra o plugin react; .cjs fica de fora)
    { files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"], rules: { "react/no-danger": "error" } },
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
