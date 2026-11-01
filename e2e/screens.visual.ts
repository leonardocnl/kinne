import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const NO_DB = "http://127.0.0.1:3101";
const TITLE = "/titulo/filme-drama-2020";
const GRAY_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGMIBQAAVwBWP0MfTAAAAABJRU5ErkJggg==",
    "base64",
);

test.beforeEach(async ({ page }) => {
    // No network in the container; a fixed pixel keeps the image frames.
    await page.route("https://image.tmdb.org/**", (route) =>
        route.fulfill({ contentType: "image/png", body: GRAY_PIXEL }),
    );
});

async function shot(page: Page, name: string, fullPage = true) {
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage });
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
        // A fullPage capture briefly shrinks innerWidth, and the 404 canvas redraws with a different
        // raster. Viewport captures never trigger that.
        await shot(page, name, !name.includes("404"));
    });
}

test("inicio", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Me surpreenda" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("inicio.png", {
        fullPage: true,
        mask: [page.locator("main p.text-data")], // today's date, mobile only
    });
});

test("escolher-agora-filtros-abertos", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Escolher agora" }).click();
    await expect(page.getByRole("button", { name: "Fechar filtros" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("b.text-count")).toContainText(/\d/);
    await expect(page).toHaveScreenshot("filtros.png");
});

test("titulo", async ({ page }) => {
    await page.goto(TITLE);
    await expect(page.getByRole("button", { name: "Vou assistir" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await shot(page, "titulo");
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

// The room code and its QR are random: the code gets fixed text (a mask would let glyphs poke out
// and hide the type) and the QR stays masked.
test("sala-criada", async ({ page }) => {
    await page.goto("/sala");
    await page.getByRole("button", { name: "Criar uma sala" }).click();
    const qr = page.getByRole("img", { name: "QR code para entrar na sala" });
    await expect(qr).toBeVisible();
    await page.mouse.move(0, 0); // the click left the pointer over a lobby control
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/^Código da sala/).evaluate((el) => {
        el.textContent = "ABCD-EFGH";
    });
    await expect(page).toHaveScreenshot("sala-criada.png", { fullPage: true, mask: [qr] });
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

test("streamings pelo uso: Sim guarda e Não tira o serviço", async ({ page }) => {
    await page.goto(TITLE);
    const saved = (key: string) =>
        page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);
    await page.waitForLoadState("networkidle");
    const question = page.getByRole("group", { name: /Você assina/ });

    await expect(question).toHaveAccessibleName("Você assina Netflix?");
    await question.getByRole("button", { name: "Sim" }).click();
    await expect(question).toHaveAccessibleName("Você assina Prime Video?");
    expect(await saved("kinne:streamings")).toBeNull();
    expect(await saved("kinne:streaming-answers")).toEqual(["netflix"]);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(question).toHaveAccessibleName("Você assina Prime Video?");
    await question.getByRole("button", { name: "Não" }).click();
    await expect
        .poll(() => saved("kinne:streamings"))
        .toEqual(["netflix", "max", "disney-plus", "globoplay"]);
    await expect(page.getByText("Netflix, Max, Disney+, Globoplay").first()).toBeAttached();
    expect(new URL(page.url()).search).toBe("");
});

test("streamings pelo uso: Não pede outra indicação quando o título sai", async ({ page }) => {
    await page.goto(TITLE);
    await page.waitForLoadState("networkidle");
    const question = page.getByRole("group", { name: /Você assina/ });
    await question.getByRole("button", { name: "Não" }).click();
    await expect(question).toHaveAccessibleName("Você assina Prime Video?");
    await question.getByRole("button", { name: "Não" }).click();
    // nas fixtures todo título está só nesses dois serviços: o sorteio roda e nada sobra
    await expect(page.getByText("Você já marcou todos os títulos")).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
});
