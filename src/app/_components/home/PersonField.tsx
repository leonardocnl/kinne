"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
    parsePersonTerm,
    ROLE_LABELS,
    titleCount,
    type PersonOutcome,
    type PersonPick,
    type PersonSuggestion,
} from "@/domain/person-search";
import { searchPeople } from "../../_actions/people";
import { RemovableChip } from "../ui/RemovableChip";
import { cx } from "../ui/cx";

const DEBOUNCE_MS = 300; // person-search B1

// C4: "não achou" e "não deu" têm frases diferentes.
const MESSAGES = {
    short: "Digite pelo menos 3 letras.",
    none: "Ninguém encontrado.",
    unavailable: "Não conseguimos buscar agora.",
} as const;

type PersonFieldProps = {
    labelId: string;
    value: PersonPick | null;
    onChange: (person: PersonPick | null) => void;
};

/**
 * "Buscar ator ou diretor" nos filtros (threat model docs/threats/person-search.md), no padrão
 * combobox do WAI-ARIA, como a busca de títulos (F1): setas escolhem, Enter marca, Esc fecha a
 * lista. Escolhida a pessoa, o campo vira uma pílula com "Remover". O termo fica só no estado do
 * componente (A8): nem URL, nem histórico, nem armazenamento.
 */
export function PersonField({ labelId, value, onChange }: PersonFieldProps) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const removeRef = useRef<HTMLButtonElement>(null);
    // depois de escolher ou remover, o foco segue para o que aparece no lugar
    const focusNext = useRef<"input" | "remove" | null>(null);
    const [term, setTerm] = useState("");
    const [answer, setAnswer] = useState<{ term: string; outcome: PersonOutcome } | null>(null);
    const [active, setActive] = useState(-1);
    const [listOpen, setListOpen] = useState(true);

    const ready = parsePersonTerm(term) !== null;
    const outcome = ready && answer?.term === term ? answer.outcome : null;
    const people = outcome?.kind === "results" ? outcome.people : [];
    const expanded = listOpen && people.length > 0;
    const listId = `${id}-list`;
    const optionId = (i: number) => `${id}-option-${i}`;

    useEffect(() => {
        if (!ready) return;
        let current = true;
        const timer = setTimeout(() => {
            searchPeople({ term })
                .catch((): PersonOutcome => ({ kind: "unavailable" }))
                .then((result) => {
                    if (!current) return;
                    setAnswer({ term, outcome: result });
                    setActive(-1);
                });
        }, DEBOUNCE_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [term, ready]);

    // a lista fica na área que rola do painel: a opção escolhida pelas setas fica sempre visível
    useEffect(() => {
        if (active >= 0)
            document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId deriva de id, estável
    }, [active]);

    useEffect(() => {
        if (focusNext.current === "input") inputRef.current?.focus();
        if (focusNext.current === "remove") removeRef.current?.focus();
        focusNext.current = null;
    }, [value]);

    function choose(person: PersonSuggestion) {
        focusNext.current = "remove";
        setTerm("");
        setAnswer(null);
        onChange({ id: person.id, name: person.name, role: person.role });
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (people.length === 0) return;
            event.preventDefault();
            setListOpen(true);
            const step = event.key === "ArrowDown" ? 1 : -1;
            setActive((i) => {
                if (step === 1) return i + 1 >= people.length ? 0 : i + 1;
                return i <= 0 ? people.length - 1 : i - 1;
            });
        } else if (event.key === "Enter" && expanded && active >= 0 && people[active]) {
            event.preventDefault();
            choose(people[active]);
        } else if (event.key === "Escape" && expanded) {
            // a primeira Esc fecha só a lista; a segunda fecha o painel
            event.preventDefault();
            event.stopPropagation();
            setListOpen(false);
            setActive(-1);
        }
    }

    if (value) {
        return (
            <div>
                <RemovableChip
                    removeRef={removeRef}
                    removeLabel={`Remover ${value.name}`}
                    onRemove={() => {
                        focusNext.current = "input";
                        onChange(null);
                    }}
                >
                    {value.name} · {ROLE_LABELS[value.role]}
                </RemovableChip>
            </div>
        );
    }

    const status =
        term.trim().length === 0
            ? null
            : !ready
              ? MESSAGES.short
              : !outcome
                ? "Buscando…"
                : outcome.kind === "results"
                  ? null
                  : MESSAGES[outcome.kind];
    const count =
        people.length === 1 ? "1 pessoa encontrada." : `${people.length} pessoas encontradas.`;

    return (
        <div className="flex flex-col gap-2">
            <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-labelledby={labelId}
                aria-autocomplete="list"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={80}
                placeholder="Nome de quem atua ou dirige"
                value={term}
                onChange={(event) => {
                    setTerm(event.target.value);
                    setListOpen(true);
                }}
                onKeyDown={onKeyDown}
                className="h-target min-w-0 rounded-pill border border-line bg-chip px-4 text-small text-paper placeholder:text-soft"
            />
            <ul
                id={listId}
                role="listbox"
                aria-label="Pessoas encontradas"
                className={cx("flex flex-col gap-1", !expanded && "hidden")}
            >
                {people.map((person, i) => (
                    <li
                        key={person.id}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === active}
                        onClick={() => choose(person)}
                        onPointerMove={() => setActive(i)}
                        className={cx(
                            "flex min-h-target cursor-pointer flex-col justify-center rounded-control px-4 py-1.5 transition duration-hover motion-reduce:transition-none",
                            i === active && "bg-hover outline outline-line-strong",
                        )}
                    >
                        <span className="truncate text-small text-paper">{person.name}</span>
                        <span className="text-data text-faint">
                            {ROLE_LABELS[person.role]} · {titleCount(person.titles)}
                        </span>
                    </li>
                ))}
            </ul>
            <p role="status" className={cx("px-1 text-data text-soft", !status && "sr-only")}>
                {status ?? (expanded ? count : "")}
            </p>
        </div>
    );
}
