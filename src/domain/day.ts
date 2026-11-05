// Um dia do calendário de Brasília (RNG006), como "2026-10-10".
export type Day = string & { readonly __brand: "Day" };

const TIME_ZONE = "America/Sao_Paulo";

export function parseDay(value: string): Day {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
        throw new Error(`Dia inválido: ${value}`);
    }
    return value as Day;
}

export function brasiliaDay(now: Date): Day {
    // en-CA formata como AAAA-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now) as Day;
}

export function addDays(day: Day, days: number): Day {
    const date = new Date(`${day}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10) as Day;
}

// "Sexta, 9 de outubro".
export function longDate(day: Day): string {
    const text = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
    })
        .format(new Date(`${day}T12:00:00Z`))
        .replace("-feira", "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}
