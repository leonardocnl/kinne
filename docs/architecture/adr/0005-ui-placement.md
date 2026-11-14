# 0005: Where UI code lives

## Context

Routes, components, server actions and browser storage all live under `src/app` today. Components that carry a business rule sit next to generic visual pieces, and input schemas sit next to the actions instead of next to the rule they protect.

## Decision

- **`src/app/`: routes only, thin.** A route composes components and calls modules.
- **`src/modules/<module>/ui/`: components of a subject**, for example `FiltersPanel` in `discovery` and `RoomApp` in `room`.
- **`src/shared/ui/`: the design system.** Tokens and components with no business rule: buttons, glass chips, typography, `TmdbImage`, `GradientAscii`.
- **Input schemas (zod) live in the module**, next to the use case. The server action only imports them.
- **Browser storage:** each module has its own client adapter, for example the visitor's taste in `taste`.
- **Server actions answer in one shape:** `{ ok: true, data } | { ok: false, error }`, where `error` is a generic message. The technical detail goes only to the server log.

## Alternatives

- **All components in `src/app`.** Rejected: subject rules leak into routes and cannot be covered by the module boundaries.
- **All components in `shared/ui`.** Rejected: the design system would import business modules, which rule 7 forbids.
- **Schemas next to the actions.** Rejected: the validation belongs to the use case, which can be called from more than one action.

## Consequences

- A component belongs to `shared/ui` only if it knows nothing about the business. If it imports a module, it belongs to that module.
- Client components of a module must not import its server code (rule 5 in [boundaries.md](../boundaries.md)).
- Every action has the same answer shape, so screens handle errors in one way and never show technical detail ([security.md](../../security.md) §6).

## Status

Accepted, 2026-11-01. Applied as each module is moved (F2); `shared/ui` is consolidated in F3.
