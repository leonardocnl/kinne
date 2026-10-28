// Figuras para o AsciiType, como caminhos SVG numa caixa de 512 por 512 (unidades do caminho).
// Cada parte apaga um contorno em volta de si antes de pintar: as formas da frente ficam
// separadas das de trás por um vão, como num ícone.

export type Figure = { d: string; alpha: number }[];

const head = (x: number, y: number, r: number) =>
    `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

// corpo: um arco em cima de um retângulo, de `top` até a base
const body = (x: number, top: number, width: number, base: number) => {
    const r = width / 2;
    return `M ${x - r} ${base} V ${top + r} A ${r} ${r} 0 0 1 ${x + r} ${top + r} V ${base} Z`;
};

const BACK = [171, 341];
const FRONT = [86, 256, 426];

/** Grupo de cinco pessoas: duas atrás (mais apagadas) e três na frente. */
export const PEOPLE: Figure = [
    ...BACK.map((x) => ({ d: body(x, 175, 160, 300), alpha: 0.55 })),
    ...BACK.map((x) => ({ d: head(x, 128, 66), alpha: 0.55 })),
    ...FRONT.map((x) => ({ d: body(x, 325, 170, 452), alpha: 1 })),
    ...FRONT.map((x) => ({ d: head(x, 278, 66), alpha: 1 })),
];
