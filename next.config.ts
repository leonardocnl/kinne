import type { NextConfig } from "next";
import { securityHeaders } from "./src/infrastructure/http/security-headers";

const nextConfig: NextConfig = {
    /* config options here */
    // security.md §2/§10: sem X-Powered-By
    poweredByHeader: false,
    cacheComponents: true,
    partialPrefetching: true,
    experimental: {
        // busca G8: o maior corpo é o da surpresa e dos filtros (até 2 mil ids, ~14 KB)
        serverActions: { bodySizeLimit: "32kb" },
    },
    // O endereço da sala (e o código dele, no QR) nunca vai como referência a outro site
    // (group-room C1). Vale para /sala e tudo sob ela.
    async headers() {
        return [
            // Em todas as respostas: páginas, API, 404 e arquivos estáticos (security.md §10).
            {
                source: "/:path*",
                headers: securityHeaders(process.env.NODE_ENV === "development"),
            },
            {
                source: "/sala/:path*",
                headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
            },
        ];
    },
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

export default nextConfig;
