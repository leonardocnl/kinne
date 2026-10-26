import { LiveHorizon } from "./LiveHorizon";

// Horizonte de caracteres no fim do rodapé: um degradê amarelo que nasce na borda de baixo e, por cima, caracteres
// mais densos onde há mais luz. Tudo sai pronto do servidor: zero JS de cliente (a home está no
// limite do orçamento). É também o que aparece até o animado (LiveHorizon, WebGL) chegar e o que
// fica com movimento reduzido. Duas camadas de caracteres se alternam em CSS, como cintilação; com
// movimento reduzido, nada se mexe. Adaptado, sem o mouse, do GradientASCII (formato "horizon").

const CHARACTERS = " =+xX0S8#@";
const COLUMNS = 220;
const ROWS = 36;

// hash inteiro determinístico: o mesmo desenho em todo render (sem diferença de hidratação)
function hash(x: number, y: number, seed: number) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Linhas de caracteres: a luz é uma elipse abaixo da base; quanto mais perto, mais denso. */
export function horizonRows(seed: number, columns = COLUMNS, rows = ROWS) {
    const last = CHARACTERS.length - 1;
    const lines: string[] = [];
    for (let row = 0; row < rows; row++) {
        let line = "";
        for (let column = 0; column < columns; column++) {
            // um caractere tem 0,6 de largura por 1 de altura
            const x = ((column + 0.5 - columns / 2) * 0.6) / (columns * 0.6 * 0.34);
            const y = (rows - row - 0.5 + rows * 0.2) / (rows * 1.05);
            const light = Math.max(0, 1 - Math.hypot(x, y));
            const tone = Math.min(1, light ** 0.75 + (hash(column, row, seed) - 0.5) * 0.18);
            const present = light > 0.04 && hash(row, column, seed + 7) < 0.82;
            line += present ? CHARACTERS[Math.round(tone * last)] : " ";
        }
        lines.push(line);
    }
    return lines.join("\n");
}

// o bloco de caracteres é mais largo que qualquer tela e fica centrado; o degradê pinta cada letra
const glyphs =
    "absolute bottom-0 left-1/2 -translate-x-1/2 font-ascii text-ascii whitespace-pre bg-horizon bg-clip-text text-transparent motion-reduce:animate-none";

/** O horizonte, decorativo: ocupa a caixa de quem usa (posição e tamanho ficam com o pai). */
export function AsciiHorizon({ className }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={`pointer-events-none overflow-hidden ${className ?? ""}`}
        >
            <LiveHorizon>
                <div className="absolute inset-0 animate-horizon-flow bg-horizon opacity-horizon motion-reduce:animate-none" />
                <p className={`${glyphs} animate-ascii-a`}>{horizonRows(1)}</p>
                <p className={`${glyphs} animate-ascii-b`}>{horizonRows(2)}</p>
            </LiveHorizon>
        </div>
    );
}
