# Visual refinements

Polish noticed while getting guest mode ready for the 2026-10-26 test, left for later so as not to stop the build. Earlier notes are in [refinos.md](refinos.md).

## Title screen

- On a 1280×800 window the image takes most of the height. "Vou assistir", "Já vi" and the dice end up below the fold, and the main action needs a scroll. Consider capping the frame height by the window height on desktop (US004 C10).

## Filters panel

- On desktop the panel is not modal, so Tab can leave it and reach the "Hoje" reel behind it. C1 asks for a panel over the cover, so this is allowed, but focus can get lost behind the glass. Consider keeping focus inside the panel, or dimming the reel as well.
