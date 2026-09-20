# Site 51 changes

- Fixed Team Specs hashtag loading for the very wide live spreadsheet by checking all Google CSV endpoints and choosing the richest/current response instead of accepting the first 40-team response.
- Named hashtag columns are preferred; the current second-from-right Team Specs field remains the positional fallback.
- Made each team's official hashtag visible in three places: hero identity, Club Identity, and the Branding section reached by the Branding button.
- Kept the existing Branding jump button and all Site 50 features.

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

## Site 52 — Goal horns + quieter odds navigation
- Added all 40 official 2026–27 Major League goal horn MP3s under `public/goal-horns/`.
- Kept `/horns` manual-play behavior (no autoplay; one horn at a time).
- Removed the Odds link from the main desktop/mobile header navigation.
- Kept `/odds`, `/odds/divisions`, `/odds/presidents-trophy`, and `/odds/cup` live and directly accessible.
- Preserved Vercel Analytics integration.
