# Visual refinements

Polish noticed while getting guest mode ready for the 2026-10-26 test, left for later so as not to stop the build. Earlier notes are in [refinos.md](refinos.md).

## Title screen

- On a 1280×800 window the image takes most of the height. "Vou assistir", "Já vi" and the dice end up below the fold, and the main action needs a scroll. Consider capping the frame height by the window height on desktop (US004 C10).

## Filters panel

- On desktop the panel is not modal, so Tab can leave it and reach the "Hoje" reel behind it. C1 asks for a panel over the cover, so this is allowed, but focus can get lost behind the glass. Consider keeping focus inside the panel, or dimming the reel as well.

## Title search

- Result rows are pill-shaped to follow the "every touchable control is a pill" rule; with a poster at the left edge the highlight looks a bit heavy. Consider a softer row highlight or a dedicated list-row token.
- On mobile the panel covers the top of the cover with no dimming behind it. Consider a scrim below the panel, as in the filters panel.
- Titles without a poster image show an empty frame. Consider a typographic placeholder (initials or type icon).
- A non-recommendable title opened from search shows only "Vou assistir" and "Já vi". After "Já vi" the screen stays put with the toast; consider offering "Buscar outro" there.
- When the catalog finds some matches, the TMDB fallback is skipped. So a title missing from the catalog (e.g. "Instinto Selvagem", 1992) is not reported as "not on these streamings" ("Esse título não está em nenhum desses streamings."): the person only sees the other matches. Consider running the fallback when the best catalog match does not look like the term, or noting that the exact title was not found.
