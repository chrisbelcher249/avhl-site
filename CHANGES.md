# Site 50 changes

## Team Specs hashtags — authoritative live field
- Team pages continue to show **Official hashtag** in the Club Identity card.
- The live Team Specs Google Sheet remains the source of truth.
- Named hashtag headers are still recognized when present.
- If the header wording is missing or changed, the loader now treats the **second column from the right** in Team Specs as the authoritative hashtag field, matching the current live sheet layout.
- Hashtags are normalized to remove spaces and include a leading `#`.

## Quick Branding jump on every Major team page
- Added a **Branding** button beside Roster / Lineup / Schedule in the team-page hero.
- The button jumps directly to a new **Team branding — Arena, uniforms & presentation** anchor.
- From that point the page flows through the arena image, home/away/alternate jerseys, mascot, and arena/game-night presentation details.
- The anchor uses scroll offset so it lands cleanly below the site header.

## Carried forward from Site 49
- Footer desktop link groups remain tightened to stay on one line at normal desktop widths.
- Game Odds, Division Futures, Presidents' Trophy, and Cup odds pages.
- Minor League expansion, live standings/schedule, and promotion line.
- Major League relegation line.
- Stats leaders redesign, lineup auto-fallbacks, bracket cleanup, live official stats integration, Vercel Analytics, and social footer links.

## Verification
- `test:sim` PASS.
- `test:lineups` PASS.
- `test:sim-lineups` PASS.
- `test:lineup-storage` PASS.
