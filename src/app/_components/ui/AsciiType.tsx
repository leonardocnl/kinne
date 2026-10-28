"use client";

import { useEffect, useRef } from "react";

// Inspirado no Asciify (canvasui), escrito aqui em canvas 2D, sem dependência: um texto grande
// ("404") desenhado em caracteres. Sempre visível, apagado; perto do ponteiro (mouse ou dedo) os
// caracteres acendem, embaralham, ganham brilho e um leve desdobramento (aberração), e a área
// segue o ponteiro com atraso. Com movimento reduzido fica o desenho parado. Decorativo.

const CHARSET = " .:-=+*#%@";
const RADIUS = 0.4; // da menor dimensão do quadro
const SOFTNESS = 1;
const FOLLOW_SPEED = 3; // por segundo
const BASE = 0.32; // claridade fora do ponteiro
const GLOW = 0.75;
const PROBE_SIZE = 100; // corpo de teste para medir o texto antes de ajustá-lo à largura
const ABERRATION = 0.75;

const smooth = (edge0: number, edge1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

/** Texto grande em caracteres que reage ao ponteiro; ocupa a caixa de quem usa. */
export function AsciiType({ text, className }: { text: string; className?: string }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current!;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const style = getComputedStyle(canvas);
        const token = (name: string) => style.getPropertyValue(`--color-${name}`).trim();
        const paper = token("paper");
        const faint = token("faint");
        const display = style.getPropertyValue("--font-display");
        const mono = style.getPropertyValue("--font-ascii");
        const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

        let width = 0;
        let height = 0;
        let cell = 0;
        let columns = 0;
        let rows = 0;
        let mask = new Float32Array(0);
        // ponteiro alvo e o que segue atrás, em pixels do canvas; fora, bem longe
        const target = { x: -1e4, y: -1e4 };
        const eased = { ...target };
        let frame = 0;
        let last = 0;

        function layout() {
            const dpr = devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
            cell = Math.max(8, width / 120);
            columns = Math.ceil(width / (cell * 0.6));
            rows = Math.ceil(height / cell);
            // máscara: o texto desenhado em pixels, do tamanho do quadro, e lido no meio de cada
            // célula. Ocupa 86% da largura, até 90% da altura, centrado
            const probe = document.createElement("canvas");
            probe.width = Math.max(1, Math.round(width));
            probe.height = Math.max(1, Math.round(height));
            const p = probe.getContext("2d", { willReadFrequently: true })!;
            p.font = `500 ${PROBE_SIZE}px ${display}`;
            const size = Math.min(
                height * 0.9,
                (PROBE_SIZE * width * 0.86) / p.measureText(text).width,
            );
            p.font = `500 ${size}px ${display}`;
            p.textAlign = "center";
            p.textBaseline = "middle";
            p.fillStyle = "white";
            p.fillText(text, width / 2, height / 2);
            const data = p.getImageData(0, 0, probe.width, probe.height).data;
            mask = new Float32Array(columns * rows);
            for (let row = 0; row < rows; row++) {
                const y = Math.min(probe.height - 1, Math.round((row + 0.5) * cell));
                for (let column = 0; column < columns; column++) {
                    const x = Math.min(probe.width - 1, Math.round((column + 0.5) * cell * 0.6));
                    mask[row * columns + column] = data[(y * probe.width + x) * 4 + 3] / 255;
                }
            }
        }

        function draw(time: number) {
            ctx!.clearRect(0, 0, width, height);
            ctx!.font = `${cell}px ${mono}`;
            ctx!.textBaseline = "top";
            const reach = RADIUS * Math.min(width, height);
            const lastChar = CHARSET.length - 1;
            const shift = ABERRATION * cell * 0.18;
            for (let row = 0; row < rows; row++) {
                for (let column = 0; column < columns; column++) {
                    const a = mask[row * columns + column];
                    if (a < 0.05) continue;
                    const x = column * cell * 0.6;
                    const y = row * cell;
                    const d = Math.hypot(x - eased.x, y - eased.y);
                    const k = 1 - smooth(reach * (1 - SOFTNESS * 0.6), reach, d);
                    // perto do ponteiro os caracteres trocam com o tempo
                    const flicker =
                        k > 0.05 ? Math.sin(column * 12.9 + row * 78.2 + time * 0.012) : 0;
                    const tone = Math.min(1, a * (BASE + (1 - BASE) * k) + flicker * 0.12 * k);
                    const char = CHARSET[Math.max(1, Math.round(tone * lastChar))];
                    if (k > 0.05 && shift > 0) {
                        ctx!.globalAlpha = 0.5 * k;
                        ctx!.fillStyle = faint;
                        ctx!.fillText(char, x - shift, y);
                        ctx!.fillText(char, x + shift, y);
                    }
                    ctx!.fillStyle = paper;
                    ctx!.globalAlpha = Math.min(1, 0.25 + tone * 0.75 + GLOW * 0.35 * k);
                    ctx!.fillText(char, x, y);
                }
            }
            ctx!.globalAlpha = 1;
        }

        function tick(time: number) {
            const dt = Math.min(0.05, (time - (last || time)) / 1000);
            last = time;
            const follow = 1 - Math.exp(-FOLLOW_SPEED * 4 * dt);
            eased.x += (target.x - eased.x) * follow;
            eased.y += (target.y - eased.y) * follow;
            draw(time);
            // parado e longe do ponteiro: não gasta quadro
            const near = target.x > -1e3;
            const moving = Math.hypot(target.x - eased.x, target.y - eased.y) > 0.5;
            frame = near || moving ? requestAnimationFrame(tick) : 0;
            if (!frame) last = 0;
        }

        const wake = () => {
            if (!frame) frame = requestAnimationFrame(tick);
        };
        const onMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            target.x = e.clientX - rect.left;
            target.y = e.clientY - rect.top;
            // primeira entrada: a área nasce no ponteiro, sem atravessar a tela
            if (eased.x < -1e3) Object.assign(eased, target);
            wake();
        };
        const onLeave = () => {
            target.x = target.y = -1e4;
            wake();
        };

        layout();
        draw(0);
        const resize = new ResizeObserver(() => {
            layout();
            draw(performance.now());
        });
        resize.observe(canvas);
        if (still) return () => resize.disconnect();
        window.addEventListener("pointermove", onMove);
        document.documentElement.addEventListener("pointerleave", onLeave);
        return () => {
            resize.disconnect();
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onMove);
            document.documentElement.removeEventListener("pointerleave", onLeave);
        };
    }, [text]);

    return <canvas ref={ref} aria-hidden="true" className={className} />;
}
