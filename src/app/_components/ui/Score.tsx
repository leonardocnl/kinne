/** Nota do TMDB sobre a imagem, no canto inferior direito. É texto: não se toca, não é pílula. */
export function Score({ value }: { value: string }) {
    return (
        <p className="absolute right-4.5 bottom-4 flex h-control items-center gap-1.75 text-paper text-shadow-score">
            <span className="sr-only">Nota no TMDB:</span>
            <b className="font-display text-score font-medium">{value}</b>
            <span
                aria-hidden="true"
                className="text-caption font-semibold tracking-score opacity-80"
            >
                TMDB
            </span>
        </p>
    );
}
