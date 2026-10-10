// ícones usados pelas telas (os só da /design ficam em design/_sections/icons.tsx)
export function PlayIcon() {
    return (
        <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true">
            <path d="M3 1.6v8.8L10.4 6z" />
        </svg>
    );
}

export function PauseIcon() {
    return (
        <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true">
            <rect x="2" y="1.5" width="2.6" height="9" rx="0.6" />
            <rect x="7.4" y="1.5" width="2.6" height="9" rx="0.6" />
        </svg>
    );
}
