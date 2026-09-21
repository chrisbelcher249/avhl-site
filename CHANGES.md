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


## Site 57 — Official Seed Lock / Historical Replays
- Saving an official game now locks an immutable replay snapshot before the official stat rows are written.
- The snapshot freezes the seed, simulator version, exact matchup input (ratings, rosters and owner lines), uniforms, full event timeline, goal replay keyframes and final summary.
- Replay archives are compressed in-browser and persisted in the same Redis/KV backend family used by owner lineups and injuries.
- Official save fails closed if replay persistence is unavailable, so a new official result cannot be created without its historical replay.
- `/schedule` and every team schedule show a Replay button after a completed game has a locked snapshot.
- `/sim/replay/[gameId]` opens the simulator in read-only historical mode and plays the stored event timeline rather than rerunning the current simulator engine.
- Historical playback ignores current rosters, ratings and lineup changes, preserving old games as simulator physics evolve.

## Site 59 — live scoring credits + manpower label

- Fixed simulator strength display to read away skaters first, matching the scoreboard orientation (for example 5-on-4 instead of 4-on-5 when the away team has the power play).
- Goal replay scorer and assist numbers now start from the official 2026–27 season stats and add the current game's credits through that goal.
- Historical official replays use only stats from games before the replayed game, so goal/assist ordinal numbers remain correct in old games.
- Added `/api/sim-season-scoring` as a no-cache compact scoring-total feed for the simulator.
- Simulator version bumped to V6.7.2.

## Site 61 — detailed league player stats + GP safeguards

- Added `/statistics/skaters` with a league-wide sortable 2026–27 skater table.
- Added `/statistics/goalies` with a league-wide sortable 2026–27 goalie table.
- Added two prominent buttons on `/statistics` linking to those detailed tables.
- Every displayed column can be sorted ascending/descending; both tables also include search and team filtering.
- Skater GP is now explicitly derived from unique official player/game rows, so every dressed skater receives one GP even with a zero-stat box score and an accidental duplicate sheet row cannot inflate GP.
- Goalie GP remains credited only when a goalie records ice time; `Dressed` separately tracks backup appearances.
- Official game verification now fails closed unless each team exports all 18 unique dressed skaters and both unique dressed goalies, preventing an incomplete official save from silently losing a player's GP.
- Added simulator coverage checks confirming each official game produces 36 skater rows and 4 goalie rows.
