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

export function BackIcon() {
    return (
        <svg
            viewBox="0 0 20 20"
            className="size-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <path d="M17 10H3M8 5l-5 5 5 5" />
        </svg>
    );
}

export function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
    );
}

export function DiceIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="size-5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
            <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function CloseIcon() {
    return (
        <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <path d="M3 3l10 10M13 3L3 13" />
        </svg>
    );
}

export function SearchIcon() {
    return (
        <svg
            viewBox="0 0 20 20"
            className="size-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
        >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.5 12.5L17 17" />
        </svg>
    );
}
