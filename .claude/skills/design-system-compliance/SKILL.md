---
name: design-system-compliance
description: Checklist for building UI that follows the project's design system and accessibility basics. Use for any screen or component work.
---

# Design system compliance

## Kinne specifics

- `DESIGN.md` wins over this checklist. Tokens live only in `src/app/globals.css`;
  `src/app/design-tokens.test.ts` fails on raw hex, px or arbitrary Tailwind values.
- One `signal` (yellow) per screen, on the main control; only the exceptions recorded in
  `DESIGN.md` are allowed.
- Mobile up to 860px: `max-desktop:` and `desktop:` variants.

## Tokens

- Colors, spacing, radii, shadows and fonts come from tokens. A raw hex or px value that is
  not a token is a bug unless the design file allows it.
- Respect usage rules, not just values (e.g. "accent color only on the main control").

## Components

- Reuse existing components; extend them with a prop before creating a near-duplicate.
- Every interactive element has hover, focus-visible, active and disabled states.
- Loading, empty and error states exist for every screen that fetches data.

## Accessibility

- Semantic elements (`button` for actions, `a` for navigation, headings in order).
- Every input has a label; icons that act have an accessible name.
- Contrast at least WCAG AA. Respect `prefers-reduced-motion`.
- Everything works with the keyboard alone, with a visible focus.

## Copy

- Interface text in the project's UI language, consistent tone, no placeholder text left.

## Handing off

- Tell Leonardo the route and the state needed to see the change. No screenshots.
