type Rgba = [number, number, number, number];

/** Lê uma cor como o CSS devolve um token: "#rgb[a]", "#rrggbb[aa]" ou "rgb(r g b / a)". */
export function parseColor(value: string): Rgba | undefined {
    const hex = value.trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
    if (hex) {
        // o CSS minificado escreve as cores translúcidas como #rrggbbaa
        const full = (hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex).padEnd(8, "f");
        const [r, g, b, a] = [0, 2, 4, 6].map((i) => parseInt(full.slice(i, i + 2), 16));
        return [r, g, b, a / 255];
    }
    const rgb = value.match(
        /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+))?\s*\)$/,
    );
    if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), Number(rgb[4] ?? 1)];
    return undefined;
}

function luminance([r, g, b]: Rgba) {
    const [lr, lg, lb] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Contraste WCAG da cor sobre o fundo; cor translúcida é misturada ao fundo antes. */
export function contrast(color: string, background: string): number | undefined {
    const fg = parseColor(color);
    const bg = parseColor(background);
    if (!fg || !bg) return undefined;
    const a = fg[3];
    const mixed = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1) as Rgba;
    const [light, dark] = [luminance(mixed), luminance(bg)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
}

/** Nível WCAG para texto: AAA a partir de 7:1, AA a partir de 4,5:1. */
export function wcagLevel(ratio: number) {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    return undefined;
}
