import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const NO_DB = "http://127.0.0.1:3101";
const TITLE = "/titulo/beleza-verdadeira-2020";
const GRAY_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGMIBQAAVwBWP0MfTAAAAABJRU5ErkJggg==",
    "base64",
);

test.beforeEach(async ({ page }) => {
    // Catalog images change with the data; a fixed pixel keeps only the frame and the layout.
    await page.route("https://image.tmdb.org/**", (route) =>
        route.fulfill({ contentType: "image/png", body: GRAY_PIXEL }),
    );
});

async function shot(page: Page, name: string) {
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

/**
 * The catalog and the daily picks change every day. Swaps their text for fixed copy with the same
 * structure, so a diff means the layout changed and not the data.
 */
async function freezeCatalogText(page: Page) {
    await page.evaluate(() => {
        const set = (selector: string, text: string) =>
            document.querySelectorAll(`main ${selector}`).forEach((el) => {
                el.textContent = text;
            });
        set("h1", "Título de referência");
        set("p.text-tagline", "Uma frase de referência, do tamanho de uma chamada comum.");
        set("p.text-data", "1 de novembro de 2026");
        set("p.text-pretty, p.max-w-synopsis", "Uma sinopse de referência. ".repeat(12));
        document.querySelectorAll("main dl").forEach((list) => {
            const row = list.firstElementChild;
            if (!row) return;
            const rows = ["Onde assistir", "Gênero", "Ano", "Duração"].map((label) => {
                const copy = row.cloneNode(true) as Element;
                copy.querySelector("dt")!.textContent = label;
                copy.querySelector("dd")!.textContent = "Valor";
                return copy;
            });
            list.replaceChildren(...rows);
        });
    });
}

for (const [name, path] of [
    ["sobre", "/sobre"],
    ["privacidade", "/privacidade"],
    ["perguntas", "/perguntas"],
    ["entrar", "/entrar"],
    ["perfil", "/perfil"],
    ["boas-vindas", "/boas-vindas"],
    ["pagina-404", "/nao-existe/pagina"],
    ["titulo-404", "/titulo/nao-existe-1900"],
    ["sala-codigo-inexistente", "/sala/0000-0000"],
] as const) {
    test(name, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await shot(page, name);
    });
}

// The live ASCII demos on this page draw random characters; every other part is compared.
test("design", async ({ page }) => {
    await page.goto("/design");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("design.png", {
        fullPage: true,
        mask: [page.locator("canvas")],
    });
});

test("inicio", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Me surpreenda" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await freezeCatalogText(page);
    await expect(page).toHaveScreenshot("inicio.png", {
        fullPage: true,
        mask: [page.locator("main section ul"), page.locator("main .rounded-tag")],
    });
});

test("escolher-agora-filtros-abertos", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Escolher agora" }).click();
    await expect(page.getByRole("button", { name: "Fechar filtros" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await freezeCatalogText(page);
    await expect(page.locator("b.text-count")).toContainText(/\d/);
    await expect(page).toHaveScreenshot("filtros.png", {
        mask: [page.locator("p:has(> b.text-count)")],
    });
});

test("titulo", async ({ page }) => {
    await page.goto(TITLE);
    await expect(page.getByRole("button", { name: "Vou assistir" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await freezeCatalogText(page);
    await expect(page).toHaveScreenshot("titulo.png", {
        fullPage: true,
        mask: [page.locator("main .rounded-tag")],
    });
});

test("sala-entrada", async ({ page }) => {
    await page.goto("/sala");
    await expect(page.getByRole("button", { name: "Criar uma sala" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await shot(page, "sala-entrada");
});

test("sala-entrar-com-codigo", async ({ page }) => {
    await page.goto("/sala");
    await page.getByRole("button", { name: "Entrar com um código" }).click();
    await expect(page.getByRole("textbox")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await shot(page, "sala-entrar-com-codigo");
});

// Writes one room per project, two per run, to develop; rooms expire and the daily job purges.
// Room creation allows 5 per hour per client (security §7), so this capture
// is opt-in: VISUAL_ROOM=1 npm run test:visual.
test("sala-criada", async ({ page }) => {
    test.skip(!process.env.VISUAL_ROOM, "spends the real room-creation limit");
    await page.goto("/sala");
    await page.getByRole("button", { name: "Criar uma sala" }).click();
    const qr = page.getByRole("img", { name: "QR code para entrar na sala" });
    await expect(qr).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("sala-criada.png", {
        fullPage: true,
        mask: [qr, page.getByLabel(/^Código da sala/)],
    });
});

// The prerendered shell, without its scripts, stays on the Suspense fallback forever.
for (const [name, path, shell] of [
    ["skeleton-inicio", "/", ".next/server/app/index.html"],
    ["skeleton-titulo", TITLE, ".next/server/app/titulo/[slug].html"],
] as const) {
    test(name, async ({ page }) => {
        await page.route("**/_next/static/**/*.js", (route) => route.abort());
        await page.route(`**${path}`, (route) =>
            route.fulfill({ contentType: "text/html", body: readFileSync(shell, "utf8") }),
        );
        await page.goto(path);
        await shot(page, name);
    });
}

for (const [name, path] of [
    ["erro-inicio", "/"],
    ["erro-titulo", TITLE],
] as const) {
    test(name, async ({ page }) => {
        await page.goto(`${NO_DB}${path}`);
        await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await shot(page, name);
    });
}
