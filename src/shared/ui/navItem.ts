// Parte do chip: no celular, um terço da largura; no computador, largura fixa.
export const navPart = "flex max-desktop:flex-1 desktop:w-nav-part";

// Aba da navbar.
export const navItem =
    "relative flex flex-1 h-target items-center justify-center gap-2 rounded-pill text-small font-medium whitespace-nowrap transition-colors duration-hover motion-reduce:transition-none";
// no hover a parte só sobe de soft para paper: sem fundo nem contorno (exceção do DESIGN.md)
export const navIdle = "text-soft hover:text-paper focus-visible:text-paper";

// Vidro preto translúcido: tinta preta leve, desfoque leve, reflexo de cima e o que passa por trás borrado e
// escurecido (backdrop-brightness), para o texto ter 4,5:1 até sobre imagem branca (exceção da
// navbar à regra de 7:1). `glass` é só o preenchimento; `smoke` tem também borda e sombra.
export const glass =
    "bg-nav bg-linear-to-b from-sheen to-transparent backdrop-blur-veil backdrop-saturate-glass backdrop-brightness-45";
export const smoke = `rounded-pill border border-line shadow-nav ${glass}`;
