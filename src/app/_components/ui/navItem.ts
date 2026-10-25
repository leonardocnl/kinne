// Parte do chip: no celular, um terço da largura; no computador, largura fixa.
export const navPart = "flex max-desktop:flex-1 desktop:w-nav-part";

// Aba da navbar.
export const navItem =
    "relative flex flex-1 h-target items-center justify-center gap-2 rounded-pill text-small font-medium whitespace-nowrap transition-colors duration-hover motion-reduce:transition-none";
// no hover a parte só sobe de soft para paper: sem fundo nem contorno (exceção do DESIGN.md)
export const navIdle = "text-soft hover:text-paper focus-visible:text-paper";
