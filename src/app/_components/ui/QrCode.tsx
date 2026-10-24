import { encodeQr } from "@/domain/qr";
import { cx } from "./cx";

/**
 * QR code de um texto, em SVG. Os módulos escuros usam a cor do texto (ink) sobre o papel claro,
 * com a margem de silêncio de 4 módulos que a leitura pede. O texto vai só para o desenho; o nome
 * acessível diz para que serve.
 */
export function QrCode({
    text,
    label,
    className,
}: {
    text: string;
    label: string;
    className?: string;
}) {
    const qr = encodeQr(text);
    const quiet = 4;
    const side = qr.size + quiet * 2;
    const path = qr.modules
        .flatMap((row, r) =>
            row.flatMap((dark, c) => (dark ? [`M${c + quiet} ${r + quiet}h1v1h-1z`] : [])),
        )
        .join("");
    return (
        <svg
            viewBox={`0 0 ${side} ${side}`}
            role="img"
            aria-label={label}
            shapeRendering="crispEdges"
            className={cx("bg-paper text-ink", className)}
        >
            <path d={path} fill="currentColor" />
        </svg>
    );
}
