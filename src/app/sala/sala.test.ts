import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// group-room C1/RNE002: o código só no caminho do QR e trocado por /sala ao entrar; nenhum query
// param; Referrer-Policy no-referrer em /sala. Verificações sobre o código-fonte.
const root = join(import.meta.dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("endereço da sala", () => {
    it("a página do QR troca o endereço por /sala antes de entrar na sala (RNE002)", () => {
        const app = read("src/app/_components/room/RoomApp.tsx");
        expect(app).toContain('window.history.replaceState(null, "", "/sala")');
        // a troca vem antes da chamada que entra na sala
        expect(app.indexOf("replaceState")).toBeLessThan(app.indexOf("joinOnce(joinCode)"));
    });

    it("o código nunca vira query string, nem é guardado no navegador", () => {
        for (const file of [
            "src/app/_components/room/RoomApp.tsx",
            "src/app/_components/room/Entry.tsx",
            "src/app/_components/room/Lobby.tsx",
            "src/app/sala/[code]/page.tsx",
        ]) {
            const text = read(file);
            expect(text, file).not.toMatch(/searchParams|URLSearchParams|\?code=|\?c=/);
            expect(text, file).not.toMatch(/localStorage|sessionStorage/);
        }
    });

    it("o QR leva ao caminho /sala/<código>, sem parâmetros", () => {
        expect(read("src/app/_components/room/Lobby.tsx")).toContain("`${origin}/sala/${code}`");
    });

    it("Referrer-Policy: no-referrer em /sala e em tudo sob ela", async () => {
        const { default: config } = await import("../../../next.config");
        const rules = await config.headers!();
        const sala = rules.find((r) => r.source === "/sala/:path*");
        expect(sala?.headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
        // o padrão do Next casa /sala e /sala/qualquer-coisa
        expect(new RegExp("^/sala(?:/.*)?$").test("/sala")).toBe(true);
    });

    it("a página não é indexada", () => {
        const layout = read("src/app/sala/layout.tsx");
        expect(layout).toContain("robots: { index: false, follow: false }");
        expect(layout).toContain('referrer: "no-referrer"');
    });

    it("o QR code usa só tokens do design: sem cor nem medida fora do globals.css", () => {
        expect(read("src/app/_components/ui/QrCode.tsx")).not.toMatch(/#[0-9a-fA-F]{3,6}\b|\[\d/);
    });
});
