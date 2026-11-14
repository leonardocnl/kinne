# 0008: Design system with the code as its source

## Context

Kinne's look was approved in an HTML mock-up and then built by hand. Values drifted: near-duplicate spacings and colors appear in screens, and nothing but attention stops a new one. There is no designer and no design file to keep in sync, and the owner approves every visual choice personally.

## Decision

- **The code is the only source of the design system.** No Figma or other design file.
- **`/lab`** is an internal route, disabled in production, for trying visual ideas in isolation.
- An idea approved in the lab becomes a **token** or a **component** in `src/shared/ui`. It never stays as a loose value in a screen.
- **Lint blocks** colors, spacing and radii outside the tokens, including arbitrary Tailwind classes.
- **`DESIGN.md`** (English) is the written source of the design rules. `DESIGN.pt-BR.md` is its translation with the same structure ([ADR 0007](0007-documentation-language.md)).
- **`/guidelines`** is a public page in the format of an editorial brand book. It renders the real components and shows the text of `DESIGN.md`, in Portuguese by default with English by a selector saved in the browser, and offers `DESIGN.md` for download. Sections: Foundations, Brand, Color, Typography, Glass and texture, Components, Motion, Voice, Export.
- **Every visual change is approved by the owner.** A pull request that touches the interface is never merged automatically ([ADR 0009](0009-review-and-auto-merge.md)).

Rules already decided, recorded in `DESIGN.md`:

- background `#020202`, no glow;
- accent `#FFDF25` (`signal`) only on the main control of each screen and on the brand icon: one yellow per screen, with the owner's exceptions listed in `DESIGN.md`;
- yellow wordmark, never recolored;
- Darker Grotesque 500 for titles, Manrope for text, tabular numbers;
- square corners on images and posters;
- medium glass, soft corners and grain on buttons and chips;
- a selected chip is filled, with no icon;
- skeletons while loading.

## Alternatives

- **Figma as the source.** Rejected: a second source to keep in sync, with nobody whose job is to do it.
- **Tokens by convention, without lint.** Rejected: that is how the duplicates appeared.
- **A component workshop tool such as Storybook.** Rejected: a large dependency for what one internal route does.
- **Screenshot tests as the lock on approved visuals.** This was the plan of 2026-11-01. Changed on 2026-11-14: the project is preparing to stop using screenshots. The lock is the token lint plus the owner's review of every visual change.

## Consequences

- A new visual value costs a token and a name, on purpose.
- The public guidelines cannot drift from the product, because they render the product's own components.
- Without screenshots, an unintended visual change in a file that is not classified as visual is caught only by review. The visual risk class is therefore wide: any component, style or asset file.
- The foundation plan mentions `#FFF340` as the accent. The value in use, and the decision, is `#FFDF25`.
- The screenshot suite (`test:visual`) still runs in CI today. Nothing new depends on it, and removing it is a separate change.

## Status

Accepted, 2026-11-01. Amended 2026-11-14 (accent value; screenshots no longer the lock). Today the tokens are in `src/app/globals.css`, a test rejects loose values, the internal reference is `/design`, and `DESIGN.md` is in Portuguese and still names the approved mock-up as the visual source. `src/shared/ui`, the lint, `/lab`, `/guidelines` and the English `DESIGN.md` arrive in F3.
