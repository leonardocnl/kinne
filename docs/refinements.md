# Visual refinements

Polish noticed while getting guest mode ready for the 2026-10-26 test, left for later so as not to stop the build. Earlier notes are in [refinos.md](refinos.md).

## Title screen

- Resolved in feat/layout-polish (phase 1): on desktop the action group sits on the title's first line, so it stays above the fold at 1280×800 whatever the synopsis length.

## Filters panel

- On desktop the panel is not modal, so Tab can leave it and reach the "Hoje" reel behind it. C1 asks for a panel over the cover, so this is allowed, but focus can get lost behind the glass. Consider keeping focus inside the panel, or dimming the reel as well.

## Title search

- Resolved in feat/layout-polish (phase 1): result rows are taller (56 px posters) with a radius concentric to the panel instead of a pill.
- On mobile the panel covers the top of the cover with no dimming behind it. Consider a scrim below the panel, as in the filters panel.
- Titles without a poster image show an empty frame. Consider a typographic placeholder (initials or type icon).
- A non-recommendable title opened from search shows only "Vou assistir" and "Já vi". After "Já vi" the screen stays put with the toast; consider offering "Buscar outro" there.
- When the catalog finds some matches, the TMDB fallback is skipped. So a title missing from the catalog (e.g. "Instinto Selvagem", 1992) is not reported as "not on these streamings" ("Esse título não está em nenhum desses streamings."): the person only sees the other matches. Consider running the fallback when the best catalog match does not look like the term, or noting that the exact title was not found.

## End of rounds (phase 4)

- On desktop the end-state buttons ("Sortear entre os próximos 10", "Mudar filtros", "Recomeçar") sit above the heading's baseline: StateScreen keeps the bottom margin it had for the old two-line layout. Consider aligning the button row with the heading's last line.
- The frame of the end state is still empty (already in refinos.md).
