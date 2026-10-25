// Gerador de QR code (ISO/IEC 18004) sem dependência: modo bytes, correção de erro M, versões 1 a
// 10, o bastante para um endereço curto como https://kinne.app/sala/ABCD2345 (até 213 bytes).
// Devolve a matriz de módulos (true = escuro) para a tela desenhar em SVG.

// [dados por bloco, bloco, quantidade] por grupo, e códigos de correção por bloco, no nível M.
const BLOCKS_M: readonly { ec: number; groups: readonly (readonly [number, number])[] }[] = [
    { ec: 10, groups: [[16, 1]] },
    { ec: 16, groups: [[28, 1]] },
    { ec: 26, groups: [[44, 1]] },
    { ec: 18, groups: [[32, 2]] },
    { ec: 24, groups: [[43, 2]] },
    { ec: 16, groups: [[27, 4]] },
    { ec: 18, groups: [[31, 4]] },
    {
        ec: 22,
        groups: [
            [38, 2],
            [39, 2],
        ],
    },
    {
        ec: 22,
        groups: [
            [36, 3],
            [37, 2],
        ],
    },
    {
        ec: 26,
        groups: [
            [43, 4],
            [44, 1],
        ],
    },
];

const ALIGNMENT: readonly (readonly number[])[] = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
];

const dataCapacity = (version: number) =>
    BLOCKS_M[version - 1].groups.reduce((sum, [size, count]) => sum + size * count, 0);

/** Quantos bytes cabem na versão (cabeçalho de 4 + 8 ou 16 bits de tamanho). */
export const qrByteCapacity = (version: number) =>
    Math.floor((dataCapacity(version) * 8 - 4 - (version < 10 ? 8 : 16)) / 8);

export const QR_MAX_BYTES = qrByteCapacity(10);

// --- Galois (GF(256), polinômio 0x11d) --------------------------------------------------------

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function reedSolomon(data: readonly number[], ecLength: number): number[] {
    // polinômio gerador: produto de (x - 2^i)
    let generator = [1];
    for (let i = 0; i < ecLength; i++) {
        const next = new Array<number>(generator.length + 1).fill(0);
        generator.forEach((coef, j) => {
            next[j] ^= coef;
            next[j + 1] ^= mul(coef, EXP[i]);
        });
        generator = next;
    }
    const remainder = new Array<number>(ecLength).fill(0);
    for (const byte of data) {
        const factor = byte ^ remainder[0];
        remainder.shift();
        remainder.push(0);
        for (let i = 0; i < ecLength; i++) remainder[i] ^= mul(generator[i + 1], factor);
    }
    return remainder;
}

// --- Dados ------------------------------------------------------------------------------------

function encodeData(bytes: Uint8Array, version: number): number[] {
    const bits: number[] = [];
    const push = (value: number, length: number) => {
        for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    };
    push(0b0100, 4); // modo bytes
    push(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    const capacityBits = dataCapacity(version) * 8;
    push(0, Math.min(4, capacityBits - bits.length)); // terminador
    while (bits.length % 8 !== 0) bits.push(0);
    const words: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
        words.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
    }
    for (let pad = 0; words.length < dataCapacity(version); pad++) {
        words.push(pad % 2 === 0 ? 0xec : 0x11);
    }
    return words;
}

/** Divide em blocos, calcula a correção de cada um e intercala (ISO 18004, 7.6). */
function interleave(data: readonly number[], version: number): number[] {
    const { ec, groups } = BLOCKS_M[version - 1];
    const blocks: { data: number[]; ec: number[] }[] = [];
    let offset = 0;
    for (const [size, count] of groups) {
        for (let i = 0; i < count; i++) {
            const chunk = data.slice(offset, offset + size);
            offset += size;
            blocks.push({ data: chunk, ec: reedSolomon(chunk, ec) });
        }
    }
    const out: number[] = [];
    const longest = Math.max(...blocks.map((b) => b.data.length));
    for (let i = 0; i < longest; i++) {
        for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
    }
    for (let i = 0; i < ec; i++) for (const b of blocks) out.push(b.ec[i]);
    return out;
}

// --- Matriz -----------------------------------------------------------------------------------

type Grid = { size: number; dark: boolean[][]; reserved: boolean[][] };

function newGrid(version: number): Grid {
    const size = 17 + 4 * version;
    const make = () => Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    return { size, dark: make(), reserved: make() };
}

function setFunction(grid: Grid, row: number, col: number, dark: boolean) {
    if (row < 0 || col < 0 || row >= grid.size || col >= grid.size) return;
    grid.dark[row][col] = dark;
    grid.reserved[row][col] = true;
}

function drawFinder(grid: Grid, row: number, col: number) {
    for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
            const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
            const dark =
                inside &&
                (dr === 0 ||
                    dr === 6 ||
                    dc === 0 ||
                    dc === 6 ||
                    (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
            setFunction(grid, row + dr, col + dc, dark);
        }
    }
}

function drawAlignment(grid: Grid, centerRow: number, centerCol: number) {
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setFunction(grid, centerRow + dr, centerCol + dc, dark);
        }
    }
}

const bch = (value: number, poly: number, polyBits: number, valueBits: number) => {
    let v = value << (polyBits - 1);
    for (let i = valueBits + polyBits - 2; i >= polyBits - 1; i--) {
        if ((v >>> i) & 1) v ^= poly << (i - (polyBits - 1));
    }
    return (value << (polyBits - 1)) | v;
};

function drawFunctionPatterns(grid: Grid, version: number) {
    const { size } = grid;
    drawFinder(grid, 0, 0);
    drawFinder(grid, 0, size - 7);
    drawFinder(grid, size - 7, 0);
    for (let i = 8; i < size - 8; i++) {
        setFunction(grid, 6, i, i % 2 === 0);
        setFunction(grid, i, 6, i % 2 === 0);
    }
    const centers = ALIGNMENT[version - 1];
    for (const r of centers) {
        for (const c of centers) {
            const onFinder =
                (r === 6 && c === 6) ||
                (r === 6 && c === centers[centers.length - 1]) ||
                (c === 6 && r === centers[centers.length - 1]);
            if (!onFinder) drawAlignment(grid, r, c);
        }
    }
    // reserva as áreas do formato; são preenchidas depois da máscara
    // (6, 8) e (8, 6) continuam sendo o padrão de tempo, que cruza as áreas do formato
    for (let i = 0; i < 9; i++) {
        if (i === 6) continue;
        setFunction(grid, 8, i, false);
        setFunction(grid, i, 8, false);
    }
    for (let i = 0; i < 8; i++) {
        setFunction(grid, 8, size - 1 - i, false);
        setFunction(grid, size - 1 - i, 8, false);
    }
    setFunction(grid, size - 8, 8, true); // módulo escuro fixo
    if (version >= 7) {
        const info = bch(version, 0x1f25, 13, 6);
        for (let i = 0; i < 18; i++) {
            const dark = ((info >>> i) & 1) === 1;
            const a = size - 11 + (i % 3);
            const b = Math.floor(i / 3);
            setFunction(grid, a, b, dark);
            setFunction(grid, b, a, dark);
        }
    }
}

function placeData(grid: Grid, codewords: readonly number[]) {
    const bits: boolean[] = [];
    for (const word of codewords) for (let i = 7; i >= 0; i--) bits.push(((word >>> i) & 1) === 1);
    let index = 0;
    let upward = true;
    for (let right = grid.size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let step = 0; step < grid.size; step++) {
            const row = upward ? grid.size - 1 - step : step;
            for (const col of [right, right - 1]) {
                if (!grid.reserved[row][col]) {
                    grid.dark[row][col] = index < bits.length ? bits[index] : false;
                    index++;
                }
            }
        }
        upward = !upward;
    }
}

const MASKS: readonly ((r: number, c: number) => boolean)[] = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function drawFormat(grid: Grid, mask: number) {
    // nível M = 00; BCH(15,5) com a máscara 0x5412
    const data = (0b00 << 3) | mask;
    const bits = bch(data, 0x537, 11, 5) ^ 0x5412;
    const bit = (i: number) => ((bits >>> i) & 1) === 1;
    const { size } = grid;
    for (let i = 0; i <= 5; i++) grid.dark[i][8] = bit(i);
    grid.dark[7][8] = bit(6);
    grid.dark[8][8] = bit(7);
    grid.dark[8][7] = bit(8);
    for (let i = 9; i < 15; i++) grid.dark[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) grid.dark[8][size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) grid.dark[size - 15 + i][8] = bit(i);
}

function penalty(dark: readonly (readonly boolean[])[]): number {
    const n = dark.length;
    let score = 0;
    const runs = (line: readonly boolean[]) => {
        let total = 0;
        let run = 1;
        for (let i = 1; i < n; i++) {
            if (line[i] === line[i - 1]) run++;
            else {
                if (run >= 5) total += run - 2;
                run = 1;
            }
        }
        if (run >= 5) total += run - 2;
        return total;
    };
    const finder = [true, false, true, true, true, false, true, false, false, false, false];
    const finderReversed = [...finder].reverse();
    const matches = (line: readonly boolean[], at: number, pattern: readonly boolean[]) =>
        pattern.every((v, i) => line[at + i] === v);
    for (let i = 0; i < n; i++) {
        const row = dark[i];
        const col = dark.map((r) => r[i]);
        score += runs(row) + runs(col);
        for (let j = 0; j + 11 <= n; j++) {
            for (const line of [row, col]) {
                if (matches(line, j, finder)) score += 40;
                if (matches(line, j, finderReversed)) score += 40;
            }
        }
    }
    for (let r = 0; r + 1 < n; r++) {
        for (let c = 0; c + 1 < n; c++) {
            const v = dark[r][c];
            if (v === dark[r][c + 1] && v === dark[r + 1][c] && v === dark[r + 1][c + 1])
                score += 3;
        }
    }
    const total = n * n;
    const darkCount = dark.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
    score += Math.floor(Math.abs((darkCount * 100) / total - 50) / 5) * 10;
    return score;
}

export type QrCode = { size: number; modules: readonly (readonly boolean[])[] };

/** Gera o QR code de um texto. Lança se ele não cabe na versão 10 (213 bytes). */
export function encodeQr(text: string, forceMask?: number): QrCode {
    const bytes = new TextEncoder().encode(text);
    let version = 1;
    while (version <= 10 && bytes.length > qrByteCapacity(version)) version++;
    if (version > 10) throw new RangeError("Texto grande demais para o QR code");

    const codewords = interleave(encodeData(bytes, version), version);
    const base = newGrid(version);
    drawFunctionPatterns(base, version);
    placeData(base, codewords);

    let best: { dark: boolean[][]; score: number; mask: number } | null = null;
    for (let mask = 0; mask < MASKS.length; mask++) {
        if (forceMask !== undefined && mask !== forceMask) continue;
        const grid = {
            ...base,
            dark: base.dark.map((row, r) =>
                row.map((v, c) => (base.reserved[r][c] ? v : v !== MASKS[mask](r, c))),
            ),
        };
        drawFormat(grid, mask);
        const score = penalty(grid.dark);
        if (!best || score < best.score) best = { dark: grid.dark, score, mask };
    }
    return { size: base.size, modules: best!.dark };
}
