# What changed in this rebuild

## Major League teams

- Replaced the old 3-team placeholder database with all 40 official 2026–27 Major League clubs.
- Added exact division alignment: 10 teams each in Pacific, Central, Atlantic, and Metropolitan.
- Added conference alignment: Western (Pacific/Central) and Eastern (Atlantic/Metropolitan).
- Added arena, abbreviation, prestige, market, fan-base, popularity, ownership, tax, facilities, and team-color data from the supplied specification CSV.
- Preserved the full source CSV under `data/source/`.
- Added `scripts/generate-teams.py` so the website data can be rebuilt from the CSV later.

## Website redesign

- Added a consistent sticky site header and footer.
- Rebuilt the homepage around the 2026–27 league structure.
- Rebuilt `/teams` as a responsive 40-team directory with search and division filters.
- Rebuilt dynamic `/teams/[slug]` pages with team identity, arena, division rivals, colors, ownership profile, market/fan profile, and arena facilities.
- Redesigned standings, statistics, schedule, history, and league-info pages so they fit the same visual system.
- Removed the old automatic dark-mode behavior that could make white pages unexpectedly turn dark.

## Data integrity

- Generator validates exactly 40 teams.
- Generator validates exactly 10 teams in each of the four divisions.
- Team slugs are generated consistently for all dynamic routes.

## Verification

- `npm run lint` passes with no errors.
- A full `next build` could not complete inside the ChatGPT Linux workspace because the original zip contained Mac `node_modules` and the workspace cannot download the Linux SWC package from npm. This is a platform/dependency limitation, not a lint or source-code failure.
- The clean ZIP intentionally excludes `node_modules` and `.next`; Vercel/npm will install the proper platform dependencies during deployment.
