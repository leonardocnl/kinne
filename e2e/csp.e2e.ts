import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type RunningApp, startBuiltApp } from "./server";

// A CSP vale se o navegador a aplica sem barrar nada que o app precisa. Abre as páginas
// principais no Chromium e falha com QUALQUER violação, inclusive de script inline.

type Violation = { directive: string; blocked: string; source: string };
type Page = {
    goto: (url: string, o?: object) => Promise<unknown>;
    on: (event: "console", cb: (m: { type: () => string; text: () => string }) => void) => void;
    addInitScript: (script: string) => Promise<void>;
    evaluate: <T>(fn: string) => Promise<T>;
    waitForTimeout: (ms: number) => Promise<void>;
};
type Browser = { newPage: () => Promise<Page>; close: () => Promise<void> };
type PlaywrightModule = { chromium: { launch: () => Promise<Browser> } };

// `playwright` não é dependência do projeto (o CI o instala fora do lockfile, como o lhci).
// PLAYWRIGHT_MODULE aponta para uma instalação existente quando ele não está no node_modules.
async function loadPlaywright(): Promise<PlaywrightModule> {
    const spec = process.env.PLAYWRIGHT_MODULE ?? "playwright";
    const mod = (await import(/* @vite-ignore */ spec)) as PlaywrightModule & {
        default?: PlaywrightModule;
    };
    return mod.chromium ? mod : (mod.default as PlaywrightModule);
}

const COLLECT = `
    window.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
        window.__csp.push({
            directive: e.effectiveDirective,
            blocked: e.blockedURI,
            source: e.sourceFile + ":" + e.lineNumber,
        });
    });
`;

const PAGES = [
    "/",
    "/titulo/suzume-2022",
    "/sala",
    "/entrar",
    "/privacidade",
    "/esta-pagina-nao-existe",
];

let app: RunningApp;
let browser: Browser;
beforeAll(async () => {
    app = await startBuiltApp();
    browser = await (await loadPlaywright()).chromium.launch();
});
afterAll(async () => {
    await browser?.close();
    await app?.stop();
});

async function open(path: string) {
    const page = await browser.newPage();
    const consoleCsp: string[] = [];
    page.on("console", (m) => {
        if (/content security policy|refused to/i.test(m.text())) consoleCsp.push(m.text());
    });
    await page.addInitScript(COLLECT);
    await page.goto(`${app.origin}${path}`, { waitUntil: "load" });
    // espera a hidratação e o que ela dispara
    await page.waitForTimeout(1500);
    return { page, consoleCsp };
}

describe("CSP no Chromium", () => {
    it.each(PAGES)("%s abre sem nenhuma violação", async (path) => {
        const { page, consoleCsp } = await open(path);
        const violations = await page.evaluate<Violation[]>("window.__csp");
        expect(violations).toEqual([]);
        expect(consoleCsp).toEqual([]);
    });

    it("executa os scripts inline do Next (hidratou) sem bloqueio", async () => {
        const { page } = await open("/");
        const inline = await page.evaluate<number>(
            `document.querySelectorAll("script:not([src])").length`,
        );
        expect(inline).toBeGreaterThan(0);
        // o payload do React só existe se esses scripts rodaram
        expect(await page.evaluate<boolean>(`Array.isArray(self.__next_f)`)).toBe(true);
        expect(await page.evaluate<number>(`window.__csp.length`)).toBe(0);
    });

    it("controles positivos: o coletor enxerga eval, imagem e conexão fora da política", async () => {
        const { page } = await open("/privacidade");
        // O evaluate() do Playwright libera o eval que a CSP barraria (allowUnsafeEvalBlockedByCSP),
        // inclusive num <script> criado dentro dele: o script entra num turno de evento à parte.
        const outcome = await page.evaluate<string>(`(async () => {
            setTimeout(() => {
                const s = document.createElement("script");
                s.textContent =
                    "try { eval('1'); window.__eval = 'ran'; } catch { window.__eval = 'blocked'; }";
                document.head.append(s);
            }, 0);
            const img = new Image();
            img.src = "https://exemplo.invalid/x.png";
            try { await fetch("https://exemplo.invalid/"); } catch { /* esperado */ }
            await new Promise((r) => setTimeout(r, 300));
            return window.__eval;
        })()`);
        expect(outcome).toBe("blocked");
        const directives = (await page.evaluate<Violation[]>("window.__csp")).map(
            (v) => v.directive,
        );
        expect(directives).toEqual(
            expect.arrayContaining(["script-src", "img-src", "connect-src"]),
        );
    });
});
