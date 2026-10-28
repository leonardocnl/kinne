// Só em desenvolvimento: o React marca o tempo de cada componente com performance.measure, e nas
// telas com prerender (cacheComponents) o início pode cair antes da navegação. O navegador então
// lança "cannot have a negative time stamp" e o overlay do Next derruba a tela (bug do React em
// dev, Next 16.4.2). Uma medida inválida vira nada. Em produção este bloco nem entra no JS.
if (process.env.NODE_ENV === "development") {
    const measure = performance.measure.bind(performance);
    performance.measure = ((...args: Parameters<Performance["measure"]>) => {
        try {
            return measure(...args);
        } catch {
            return undefined;
        }
    }) as Performance["measure"];
}
