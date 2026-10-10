// Tela do título contra um servidor rodando (next build && next start). Consulta o banco, por isso
// fica fora do CI. Uso: npm run smoke:title [-- http://localhost:3000]
//
// Não confere status 404: com cacheComponents a rota tem estado "postponed", e o Next envia o status
// da pré-renderização (200) antes de rodar a página (node_modules/next/dist/build/templates/
// app-page-runtime.js:1390-1391 e 1553). O garantido é a tela de não encontrado com noindex.
const base = process.argv[2] ?? "http://localhost:3000";

async function page(path: string) {
    const res = await fetch(new URL(path, base), { redirect: "manual" });
    return { status: res.status, html: await res.text() };
}

const noindex = '<meta name="robots" content="noindex"/>';
const notFound = (p: { html: string }) =>
    p.html.includes(noindex) && p.html.includes("Não encontramos esta página");
// o <title> do título vem do generateMetadata, que só o devolve se o título existe
const titled = (p: { status: number; html: string }) =>
    p.status === 200 && /<title>[^<]+ · Kinne<\/title>/.test(p.html) && !p.html.includes(noindex);

async function main() {
    const home = await (await fetch(base)).text();
    const valid = home.match(/href="(\/titulo\/[a-z0-9-]+)/)?.[1];
    if (!valid) throw new Error("Nenhum link para /titulo/ na tela inicial");

    const checks = [
        { path: "/titulo/nao-existe", ok: notFound, expected: "não encontrado com noindex" },
        { path: "/titulo/Slug%20Invalido", ok: notFound, expected: "não encontrado com noindex" },
        { path: valid, ok: titled, expected: "200 com o título" },
        { path: `${valid}?origem=dia`, ok: titled, expected: "200 com o título" },
    ];
    let failed = false;
    for (const { path, ok, expected } of checks) {
        const passed = ok(await page(path));
        failed ||= !passed;
        console.log(`${passed ? "ok " : "ERRO"} ${path} (esperado: ${expected})`);
    }
    if (failed) process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
