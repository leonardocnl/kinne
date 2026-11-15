"use client";

import { useEffect, useRef } from "react";

/*
 * Horizonte de caracteres animado no fim do rodapé, nascendo da borda de baixo, em WebGL 2: um degradê com caracteres por cima, que
 * cintilam, respiram, embaralham sob o mouse e fazem uma onda no clique. Portado do GradientASCII
 * (formato "horizon"), sem o formato fixo de cores: elas vêm dos tokens (--color-*) lidos em tempo
 * de execução. Só é baixado quando o rodapé chega perto da tela (LiveHorizon); sem WebGL 2 o
 * canvas fica vazio e aparece o horizonte em CSS de baixo.
 */

const MAX_COLORS = 8;
const MAX_CLICKS = 4;
const MAX_TRAIL = 24;
const CLICK_LIFE = 1.2;
const TRAIL_LIFE = 0.7;
const TRAIL_STEP = 0.015;
const INTRO_SECONDS = 2.4;
const ATLAS_CELL_W = 60;
const ATLAS_CELL_H = 100;
const ATLAS_COLUMNS = 16;
const FONT_SCALE = 0.78;
const FONT_PROBE = 64;

const VERTEX = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMMON = `
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
`;

const FIELD = `#version 300 es
precision highp float;
precision highp int;
uniform float uAspect;
uniform float uTime;
uniform vec3 uRamp[8];
uniform int uCount;
uniform float uScale;
uniform float uSoftness;
uniform float uFlow;
uniform float uLift;
uniform vec4 uTrail[24];
uniform float uRadius;
uniform vec4 uClicks[4];
uniform float uIntro;
uniform float uFrame;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outAux;
${COMMON}
vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 horizon(vec2 p, float time, out float order) {
  float span = 0.5 * max(uAspect, 1.0);
  float x = p.x / span;
  // uLift sobe o horizonte: a parte amarela ocupa mais da caixa
  float arch = -0.17 - uLift - 0.2 * max(0.0, 1.0 - 2.2 * uLift) * x * x + 0.02 * sin(time * 0.6);
  float soft = mix(0.05, 0.22, uSoftness);
  float edge = p.y - arch;
  float rim = 0.38 * smoothstep(-soft, 0.42, edge);
  vec2 sun = vec2(0.08 * sin(time * 0.31) * span, 0.58);
  // uLift também alarga a luz: a palavra inteira fica iluminada
  float spread = length((p - sun) / vec2(0.95 * span * (1.0 + 3.0 * uLift), 0.75));
  float sky = mix(0.55, 1.0, smoothstep(0.2, 0.95, spread));
  order = clamp(edge * 1.3, 0.0, 1.0);
  return vec3(rim, sky, smoothstep(0.18, 0.62, edge));
}

vec4 tone(float t) {
  float x = smoothstep(0.3, 1.0, t) * float(uCount - 1);
  int index = int(floor(x));
  return vec4(mix(uRamp[index], uRamp[min(index + 1, uCount - 1)], fract(x)), smoothstep(0.0, 0.38, t));
}

void main() {
  // o horizonte nasce na borda de baixo (o original nasce em cima): só o campo inverte, os
  // caracteres continuam de pé
  vec2 p = (vec2(vUv.x, 1.0 - vUv.y) - 0.5) * vec2(uAspect, 1.0);
  float time = uTime;
  vec2 q = p / uScale;
  vec2 warp = vec2(
    noise(q * 1.6 + vec2(0.0, time * 0.3)),
    noise(q * 1.6 + vec2(4.3, -time * 0.24))
  ) - 0.5;
  q += warp * uFlow * 0.18;
  float order = 0.0;
  vec3 shape = horizon(q, time, order);

  float reveal = clamp((uIntro * 1.45 - order) / 0.45, 0.0, 1.0);
  reveal = reveal * reveal * (3.0 - 2.0 * reveal);

  float scramble = 0.0;
  for (int i = 0; i < 24; i++) {
    vec4 point = uTrail[i];
    if (point.z <= 0.0) continue;
    vec2 d = p - point.xy;
    scramble = max(scramble, point.z * exp(-dot(d, d) / (uRadius * uRadius)));
  }
  for (int i = 0; i < 4; i++) {
    vec4 c = uClicks[i];
    if (c.w <= 0.0) continue;
    float d = length(p - c.xy);
    scramble = max(scramble, exp(-pow((d - c.z * 0.75) / 0.06, 2.0)) * c.w);
  }
  vec2 t = clamp(shape.xy * mix(0.7, 1.0, reveal), 0.0, 1.0);
  vec4 mixed = mix(tone(t.x), tone(t.y), shape.z);
  vec3 color = encode(labToRgb(mixed.rgb));
  float alpha = mixed.a * reveal;
  float dither = (hash12(gl_FragCoord.xy + uFrame * 13.7) - 0.5) / 255.0;
  outColor = clamp(vec4(color * alpha + dither, alpha + dither), 0.0, 1.0);
  outAux = vec4(reveal, scramble, 0.0, 1.0);
}`;

const GLYPHS = `
uniform sampler2D uField;
uniform sampler2D uAux;
uniform sampler2D uAtlas;
uniform vec2 uResolution;
uniform vec2 uCell;
uniform vec2 uOffset;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform float uDensity;
uniform float uOpacity;
uniform float uFlicker;
uniform float uGlyphTime;
${COMMON}
float sampleGlyph(float index, vec2 local, vec2 coord) {
  float column = mod(index, uAtlasGrid.x);
  float row = floor(index / uAtlasGrid.x);
  vec2 atlasUv = vec2((column + local.x) / uAtlasGrid.x, (row + 1.0 - local.y) / uAtlasGrid.y);
  vec2 continuous = coord / uAtlasGrid;
  return textureGrad(uAtlas, atlasUv, dFdx(continuous), dFdy(continuous)).a;
}

vec4 glyphAt(vec2 px) {
  vec2 coord = (px - uOffset) / uCell;
  vec2 cell = floor(coord);
  vec2 local = coord - cell;
  vec2 uv = clamp(((cell + 0.5) * uCell + uOffset) / uResolution, vec2(0.0), vec2(1.0));
  vec4 field = texture(uField, uv);
  vec4 aux = texture(uAux, uv);
  float value = dot(field.rgb, vec3(0.2126, 0.7152, 0.0722));
  float pick = hash12(cell);
  float level = hash12(cell * 1.73 + 4.1);
  float tick = floor(uGlyphTime * 9.0 + level * 9.0);
  float wobble = (hash12(cell * 2.31 + tick * 17.7) - 0.5) * uFlicker * 0.4 + (level - 0.5) * 0.1;
  float tone = clamp(pow(value, 0.75) + wobble, 0.0, 1.0);
  float index = floor(tone * (uCount - 1.0) + 0.5);
  float decode = max(aux.g, 1.0 - aux.r);
  if (decode > 0.02) {
    float frame = floor(uGlyphTime * 20.0);
    if (hash12(cell * 3.7 + frame * 5.3) < decode * 1.25) index = 1.0 + floor(hash12(cell + frame * 1.37) * (uCount - 1.0));
  }
  float present = step(pick, uDensity * mix(1.0, 0.3 + tone * 1.1, 0.55));
  float cutoff = smoothstep(0.03, 0.1, value);
  float coverage = sampleGlyph(index, local, coord);
  float alpha = uOpacity * present * cutoff * coverage * mix(1.0, 0.35 + 0.65 * level, 0.55);
  vec3 light = field.rgb * 0.55 + vec3(0.03) * field.a;
  return vec4(light * alpha, 0.6 * field.a * alpha);
}
`;

const HALO = `#version 300 es
precision highp float;
uniform float uDownscale;
in vec2 vUv;
out vec4 outColor;
${GLYPHS}
void main() {
  outColor = glyphAt(gl_FragCoord.xy * uDownscale);
}`;

const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += texture(uSource, vUv + uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv - uStep * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv + uStep * 3.2307692308) * 0.0702702703;
  sum += texture(uSource, vUv - uStep * 3.2307692308) * 0.0702702703;
  outColor = sum;
}`;

const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uHalo;
uniform float uGlow;
uniform float uGradient;
uniform float uGrain;
uniform float uFrame;
in vec2 vUv;
out vec4 outColor;
${GLYPHS}
void main() {
  vec4 base = texture(uField, vUv) * uGradient;
  vec4 glyph = glyphAt(gl_FragCoord.xy);
  vec4 halo = texture(uHalo, vUv) * uGlow;
  vec4 color = base + glyph + halo;
  float grain = (hash12(gl_FragCoord.xy + uFrame * vec2(17.0, 59.0)) + hash12(gl_FragCoord.xy * 1.31 + uFrame * 7.0) - 1.0) * uGrain;
  float body = clamp(color.a, 0.0, 1.0);
  color.rgb += grain * (0.25 + body) * 0.5;
  color.a = clamp(color.a, 0.0, 1.0);
  color.rgb = clamp(color.rgb, 0.0, color.a);
  outColor = color;
}`;

type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> };
type Target = {
    textures: (WebGLTexture | null)[];
    framebuffer: WebGLFramebuffer | null;
    width: number;
    height: number;
};
type Atlas = { texture: WebGLTexture | null; count: number; grid: [number, number] };
type Point = { x: number; y: number; age: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

// sRGB para OKLab: o degradê é interpolado em OKLab, sem o cinza no meio entre duas cores
function toLab([r, g, b]: number[]) {
    const [lr, lg, lb] = [r, g, b].map(toLinear);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
}

function link(gl: WebGL2RenderingContext, fragmentSource: string): Program | null {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    const uniforms: Program["uniforms"] = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i);
        if (!info) continue;
        const name = info.name.replace(/\[0\]$/, "");
        uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program, uniforms };
}

function createTarget(gl: WebGL2RenderingContext, count: number): Target {
    const textures = Array.from({ length: count }, () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
    });
    return { textures, framebuffer: gl.createFramebuffer(), width: 0, height: 0 };
}

function sizeTarget(gl: WebGL2RenderingContext, target: Target, width: number, height: number) {
    if (target.width === width && target.height === height) return;
    target.width = width;
    target.height = height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    target.textures.forEach((texture, i) => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA8,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            texture,
            0,
        );
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function buildAtlas(gl: WebGL2RenderingContext, characters: string, fontFamily: string): Atlas {
    const list = [...new Set(characters)];
    const font = `300 ${Math.round(ATLAS_CELL_H * FONT_SCALE)}px ${fontFamily}`;
    const columns = Math.min(ATLAS_COLUMNS, list.length);
    const rows = Math.ceil(list.length / columns);
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_CELL_W * columns;
    canvas.height = ATLAS_CELL_H * rows;
    const context = canvas.getContext("2d");
    if (context) {
        context.font = font;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "white";
        list.forEach((char, index) => {
            const x = (index % columns) * ATLAS_CELL_W + ATLAS_CELL_W / 2;
            const y = Math.floor(index / columns) * ATLAS_CELL_H + ATLAS_CELL_H / 2 + 3;
            context.fillText(char, x, y);
        });
    }
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { texture, count: list.length, grid: [columns, rows] };
}

type GradientAsciiProps = {
    /** cores do degradê, de baixo da luz para o centro: tokens (`--color-*`) ou cores CSS */
    colors: string[];
    characters?: string;
    cellSize?: number;
    density?: number;
    glyphOpacity?: number;
    glow?: number;
    flicker?: number;
    softness?: number;
    scale?: number;
    flow?: number;
    /** quanto o horizonte sobe (0 a 0,6): a parte amarela ocupa mais da caixa */
    lift?: number;
    speed?: number;
    gradientOpacity?: number;
    grain?: number;
    scrambleRadius?: number;
    fontFamily?: string;
    /** chamado quando o WebGL 2 sobe e o primeiro quadro foi desenhado */
    onReady?: () => void;
    className?: string;
};

export default function GradientAscii({
    colors,
    characters = " =+xX0S8#@",
    cellSize = 18,
    density = 0.8,
    glyphOpacity = 0.85,
    glow = 0.2,
    flicker = 0.2,
    softness = 0.5,
    scale = 1,
    flow = 0.5,
    lift = 0,
    speed = 1,
    gradientOpacity = 0.9,
    grain = 0.08,
    scrambleRadius = 0.1,
    fontFamily = "ui-monospace, Menlo, Consolas, monospace",
    onReady,
    className,
}: GradientAsciiProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const settings = {
        colors: colors.slice(0, MAX_COLORS),
        characters,
        cellSize: clamp(cellSize, 6, 64),
        density: clamp(density, 0, 1),
        glyphOpacity: clamp(glyphOpacity, 0, 1),
        glow: clamp(glow, 0, 2),
        flicker: clamp(flicker, 0, 1),
        softness: clamp(softness, 0, 1),
        scale: clamp(scale, 0.4, 2.5),
        flow: clamp(flow, 0, 2),
        lift: clamp(lift, 0, 0.6),
        speed: Math.max(0, speed),
        gradientOpacity: clamp(gradientOpacity, 0, 1),
        grain: clamp(grain, 0, 0.4),
        scrambleRadius: clamp(scrambleRadius, 0.02, 0.4),
        fontFamily,
        onReady,
    };
    const settingsRef = useRef(settings);
    useEffect(() => {
        settingsRef.current = settings;
    });

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const gl = canvas?.getContext("webgl2", {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,
            depth: false,
            stencil: false,
        });
        if (!container || !canvas || !gl) return undefined;

        const field = link(gl, FIELD);
        const halo = link(gl, HALO);
        const blur = link(gl, BLUR);
        const composite = link(gl, COMPOSITE);
        if (!field || !halo || !blur || !composite) return undefined;
        const vao = gl.createVertexArray();
        const fieldTarget = createTarget(gl, 2);
        const haloA = createTarget(gl, 1);
        const haloB = createTarget(gl, 1);

        // cor CSS (ou token --color-*) para rgb 0..1, pintando um pixel num canvas de prova
        const probe = document
            .createElement("canvas")
            .getContext("2d", { willReadFrequently: true });
        const rootStyle = getComputedStyle(document.documentElement);
        const parse = (value: string) => {
            const css = value.startsWith("--") ? rootStyle.getPropertyValue(value).trim() : value;
            if (!probe) return [0, 0, 0];
            probe.clearRect(0, 0, 1, 1);
            probe.fillStyle = "black";
            probe.fillStyle = css;
            probe.fillRect(0, 0, 1, 1);
            const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
            return [r / 255, g / 255, b / 255];
        };

        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const view = { width: 1, height: 1, ratio: 1 };
        const ramp = new Float32Array(MAX_COLORS * 3);
        const clickData = new Float32Array(MAX_CLICKS * 4);
        const clicks: Point[] = [];
        const trailData = new Float32Array(MAX_TRAIL * 4);
        const trail: Point[] = [];
        const pointer = { x: 0, y: 0, inside: false };
        let atlas: Atlas | null = null;
        let atlasKey = "";
        let paletteKey = "";
        let time = 0;
        let glyphTime = 0;
        let introClock = reduce ? 1 : 0;
        let frameSeed = 0;
        let grainClock = 0;
        let raf = 0;
        let last = 0;
        let visible = true;
        let disposed = false;

        const syncAtlas = () => {
            const s = settingsRef.current;
            const key = `${s.fontFamily}|${s.characters}`;
            if (key === atlasKey && atlas) return;
            atlasKey = key;
            if (atlas) gl.deleteTexture(atlas.texture);
            atlas = buildAtlas(gl, s.characters, s.fontFamily);
        };

        const syncPalette = () => {
            const s = settingsRef.current;
            const key = s.colors.join(",");
            if (key === paletteKey) return;
            paletteKey = key;
            s.colors.forEach((color, i) => ramp.set(toLab(parse(color)), i * 3));
        };

        const bindGlyphs = (program: Program, width: number, height: number) => {
            if (!atlas) return;
            const s = settingsRef.current;
            const u = program.uniforms;
            const cellH = s.cellSize * view.ratio;
            const cellW = cellH * (ATLAS_CELL_W / ATLAS_CELL_H);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, fieldTarget.textures[0]);
            gl.uniform1i(u.uField, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, fieldTarget.textures[1]);
            gl.uniform1i(u.uAux, 1);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
            gl.uniform1i(u.uAtlas, 2);
            gl.uniform2f(u.uResolution, width, height);
            gl.uniform2f(u.uCell, cellW, cellH);
            gl.uniform2f(
                u.uOffset,
                (width - Math.ceil(width / cellW) * cellW) / 2,
                (height - Math.ceil(height / cellH) * cellH) / 2,
            );
            gl.uniform2f(u.uAtlasGrid, atlas.grid[0], atlas.grid[1]);
            gl.uniform1f(u.uCount, atlas.count);
            gl.uniform1f(u.uDensity, s.density);
            gl.uniform1f(u.uOpacity, s.glyphOpacity);
            gl.uniform1f(u.uFlicker, reduce ? 0 : s.flicker);
            gl.uniform1f(u.uGlyphTime, glyphTime);
        };

        const draw = () => {
            const s = settingsRef.current;
            syncAtlas();
            syncPalette();
            gl.bindVertexArray(vao);
            gl.disable(gl.BLEND);

            gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTarget.framebuffer);
            gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
            gl.viewport(0, 0, fieldTarget.width, fieldTarget.height);
            gl.useProgram(field.program);
            const fu = field.uniforms;
            gl.uniform1f(fu.uAspect, view.width / view.height);
            gl.uniform1f(fu.uTime, time);
            gl.uniform3fv(fu.uRamp, ramp);
            gl.uniform1i(fu.uCount, s.colors.length);
            gl.uniform1f(fu.uScale, s.scale);
            gl.uniform1f(fu.uSoftness, s.softness);
            gl.uniform1f(fu.uFlow, s.flow);
            gl.uniform1f(fu.uLift, s.lift);
            gl.uniform4fv(fu.uTrail, trailData);
            gl.uniform1f(fu.uRadius, s.scrambleRadius);
            gl.uniform4fv(fu.uClicks, clickData);
            gl.uniform1f(fu.uIntro, introClock);
            gl.uniform1f(fu.uFrame, frameSeed);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            const glowing = s.glow > 0.001;
            if (glowing) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
                gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
                gl.viewport(0, 0, haloA.width, haloA.height);
                gl.useProgram(halo.program);
                bindGlyphs(halo, canvas.width, canvas.height);
                gl.uniform1f(halo.uniforms.uDownscale, canvas.width / haloA.width);
                gl.drawArrays(gl.TRIANGLES, 0, 3);

                gl.useProgram(blur.program);
                gl.activeTexture(gl.TEXTURE0);
                gl.uniform1i(blur.uniforms.uSource, 0);
                gl.bindFramebuffer(gl.FRAMEBUFFER, haloB.framebuffer);
                gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
                gl.uniform2f(blur.uniforms.uStep, 1 / haloA.width, 0);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
                gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
                gl.bindTexture(gl.TEXTURE_2D, haloB.textures[0]);
                gl.uniform2f(blur.uniforms.uStep, 0, 1 / haloA.height);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(composite.program);
            bindGlyphs(composite, canvas.width, canvas.height);
            const cu = composite.uniforms;
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
            gl.uniform1i(cu.uHalo, 3);
            gl.uniform1f(cu.uGlow, glowing ? s.glow : 0);
            gl.uniform1f(cu.uGradient, s.gradientOpacity);
            gl.uniform1f(cu.uGrain, s.grain);
            gl.uniform1f(cu.uFrame, frameSeed);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const updateInput = (dt: number) => {
            trail.forEach((point) => (point.age += dt));
            while (trail.length && trail[trail.length - 1].age > TRAIL_LIFE) trail.pop();
            for (let i = 0; i < MAX_TRAIL; i++) {
                const point = trail[i];
                if (!point) {
                    trailData[i * 4 + 2] = 0;
                    continue;
                }
                const k = 1 - point.age / TRAIL_LIFE;
                trailData.set([point.x, point.y, k * k, 0], i * 4);
            }
            clicks.forEach((click) => (click.age += dt));
            while (clicks.length && clicks[clicks.length - 1].age > CLICK_LIFE) clicks.pop();
            for (let i = 0; i < MAX_CLICKS; i++) {
                const click = clicks[i];
                if (!click) {
                    clickData[i * 4 + 3] = 0;
                    continue;
                }
                const k = click.age / CLICK_LIFE;
                const envelope = Math.min(1, click.age / 0.08) * (1 - k) * (1 - k);
                clickData.set([click.x, click.y, click.age, envelope], i * 4);
            }
        };

        const frame = (now: number) => {
            raf = 0;
            if (disposed || !visible || document.hidden) return;
            const s = settingsRef.current;
            const dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / 60;
            last = now;
            if (!reduce) {
                time += dt * s.speed * 0.5;
                glyphTime += dt * Math.max(s.speed, 0.15);
            }
            if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
            grainClock += dt;
            if (!reduce && grainClock > 1 / 24) {
                grainClock = 0;
                frameSeed = (frameSeed + 1) % 97;
            }
            updateInput(dt);
            draw();
            const busy = !reduce || introClock < 1 || clicks.length > 0 || trail.length > 0;
            if (busy) raf = requestAnimationFrame(frame);
            else last = 0;
        };

        const wake = () => {
            if (!raf && !disposed && visible && !document.hidden)
                raf = requestAnimationFrame(frame);
        };

        const resize = () => {
            view.width = Math.max(1, container.clientWidth);
            view.height = Math.max(1, container.clientHeight);
            view.ratio = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(view.width * view.ratio));
            canvas.height = Math.max(1, Math.round(view.height * view.ratio));
            sizeTarget(
                gl,
                fieldTarget,
                Math.max(1, Math.round(canvas.width / 2)),
                Math.max(1, Math.round(canvas.height / 2)),
            );
            const haloWidth = Math.max(1, Math.round(canvas.width / 4));
            const haloHeight = Math.max(1, Math.round(canvas.height / 4));
            sizeTarget(gl, haloA, haloWidth, haloHeight);
            sizeTarget(gl, haloB, haloWidth, haloHeight);
            draw();
            wake();
        };

        const locate = (event: PointerEvent) => {
            const rect = container.getBoundingClientRect();
            const x = (event.clientX - rect.left) / Math.max(1, rect.width);
            const y = (event.clientY - rect.top) / Math.max(1, rect.height); // campo invertido
            pointer.inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
            pointer.x = (x - 0.5) * (rect.width / Math.max(1, rect.height));
            pointer.y = y - 0.5;
        };

        const onPointerMove = (event: PointerEvent) => {
            locate(event);
            if (!pointer.inside || reduce) return;
            const head = trail[0];
            const gap = head ? Math.hypot(pointer.x - head.x, pointer.y - head.y) : Infinity;
            if (gap < TRAIL_STEP) return;
            if (head && head.age < 0.1) {
                const steps = Math.min(6, Math.floor(gap / (TRAIL_STEP * 2)));
                for (let i = 1; i <= steps; i++) {
                    const k = i / (steps + 1);
                    trail.unshift({
                        x: head.x + (pointer.x - head.x) * k,
                        y: head.y + (pointer.y - head.y) * k,
                        age: 0,
                    });
                }
            }
            trail.unshift({ x: pointer.x, y: pointer.y, age: 0 });
            trail.length = Math.min(trail.length, MAX_TRAIL);
            wake();
        };

        const onPointerDown = (event: PointerEvent) => {
            locate(event);
            if (!pointer.inside || reduce) return;
            clicks.unshift({ x: pointer.x, y: pointer.y, age: 0 });
            if (clicks.length > MAX_CLICKS) clicks.pop();
            wake();
        };

        const onVisibility = () => {
            last = 0;
            wake();
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        const intersection = new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            if (visible) {
                last = 0;
                wake();
            }
        });
        intersection.observe(container);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerdown", onPointerDown, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        // a fonte do sistema pode chegar depois: refaz os caracteres quando ela estiver pronta
        document.fonts?.load(`300 ${FONT_PROBE}px ${settingsRef.current.fontFamily}`).then(() => {
            if (disposed) return;
            atlasKey = "";
            draw();
        });
        resize();
        settingsRef.current.onReady?.();

        return () => {
            disposed = true;
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            intersection.disconnect();
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("visibilitychange", onVisibility);
            [fieldTarget, haloA, haloB].forEach((target) => {
                target.textures.forEach((texture) => gl.deleteTexture(texture));
                gl.deleteFramebuffer(target.framebuffer);
            });
            if (atlas) gl.deleteTexture(atlas.texture);
            gl.deleteVertexArray(vao);
            [field, halo, blur, composite].forEach((item) => gl.deleteProgram(item.program));
        };
    }, []);

    return (
        <div ref={containerRef} className={className}>
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 size-full" />
        </div>
    );
}
