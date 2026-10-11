import { addDays, parseDay, type Day } from "@/domain/day";

// Apagamento dos eventos do teste (RNF10). Os dias são de Brasília (RNG006) e entram inteiros:
// de 00:00 de --from até 00:00 do dia seguinte a --to.

export type DeleteEventsArgs = { from: Day; to: Day; confirm: boolean };

export type EventRange = { start: Date; end: Date };

export interface TestEventsRepository {
    countBetween(range: EventRange): Promise<number>;
    deleteBetween(range: EventRange): Promise<number>;
}

export const DELETE_EVENTS_USAGE =
    "Uso: npm run events:delete -- --from AAAA-MM-DD --to AAAA-MM-DD [--confirm]";

function strictDay(value: string | undefined, flag: string): Day {
    if (!value) throw new Error(`Falta ${flag} AAAA-MM-DD`);
    const day = parseDay(value);
    // Date.parse aceita 2026-02-30; o dia precisa existir no calendário
    if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) {
        throw new Error(`Dia inválido: ${value}`);
    }
    return day;
}

/** Lê --from, --to (com espaço ou "=") e --confirm. Qualquer outra coisa é erro. */
export function parseDeleteEventsArgs(argv: readonly string[]): DeleteEventsArgs {
    const values: Partial<Record<"--from" | "--to", string>> = {};
    let confirm = false;
    for (let i = 0; i < argv.length; i++) {
        const eq = argv[i].indexOf("=");
        const flag = eq < 0 ? argv[i] : argv[i].slice(0, eq);
        const inline = eq < 0 ? undefined : argv[i].slice(eq + 1);
        if (flag === "--confirm" && inline === undefined) confirm = true;
        else if (flag === "--from" || flag === "--to") {
            if (values[flag] !== undefined) throw new Error(`${flag} repetido`);
            values[flag] = inline ?? argv[++i];
        } else throw new Error(`Argumento desconhecido: ${argv[i]}`);
    }
    const from = strictDay(values["--from"], "--from");
    const to = strictDay(values["--to"], "--to");
    if (from > to) throw new Error(`--from (${from}) depois de --to (${to})`);
    return { from, to, confirm };
}

/** 00:00 de um dia em Brasília, com o fuso daquela data. */
export function brasiliaMidnight(day: Day): Date {
    const offset = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        timeZoneName: "longOffset",
    })
        .formatToParts(new Date(`${day}T12:00:00Z`))
        .find((p) => p.type === "timeZoneName")
        ?.value.replace("GMT", "");
    return new Date(`${day}T00:00:00${offset || "Z"}`);
}

/** O intervalo [start, end) que cobre os dias de --from a --to, inteiros. */
export function eventRange(from: Day, to: Day): EventRange {
    return { start: brasiliaMidnight(from), end: brasiliaMidnight(addDays(to, 1)) };
}

/** Conta os eventos do intervalo e só apaga com confirmação; sem ela, é ensaio. */
export async function deleteTestEvents(
    { from, to, confirm }: DeleteEventsArgs,
    repository: TestEventsRepository,
): Promise<{ range: EventRange; matched: number; deleted: number }> {
    const range = eventRange(from, to);
    const matched = await repository.countBetween(range);
    const deleted = confirm && matched > 0 ? await repository.deleteBetween(range) : 0;
    return { range, matched, deleted };
}
