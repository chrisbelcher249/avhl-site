# V5.2 simulator integration — September 3, 2026

- Added the AVHL Game Simulator at `/sim`.
- Added `Sim` to the desktop and mobile site navigation.
- Embedded the supplied V5.2 Game Center without changing the simulation or replay engine.
- Reused the website’s existing 40 Major League logos, jerseys, arena images, and mascots instead of duplicating the simulator asset pack.
- Preserved simulator seed history, replay controls, game statistics, and official-export prototype behavior.

# Minor League directory + multi-position filtering — August 31, 2026

- Added `/minor-league` with all 40 Minor League clubs, official 2026–27 logos, team colors, arenas, and Major League affiliate relationships.
- Organized the Minor League directory by the affiliate’s Major League conference/division and added team/city/affiliate search.
- Minor League cards are intentionally non-clickable until full club asset/detail pages are available.
- Expanded the centralized logo set to all 80 AVHL team logos and refreshed the AVHL league logo from the supplied 81-file pack.
- Changed `/players` position filtering from single-select to multi-select checkboxes for LW, C, RW, LD, RD, and G, with Select All/Clear controls.
- Multi-position players match any selected applicable position.

# Live data and unified logos — August 25, 2026

- Added a live `/trades` page backed by the AVHL Google Sheets trade tracker.
- Expanded `/players` filtering to LW, C, RW, LD, RD, and G, including multi-position matching.
- Added min/max overall-rating and AAV range controls to `/players`.
- Wired the player database to the live Google Sheet, with the bundled 1,909-player database retained as a fallback if Google Sheets is unavailable.
- Team rosters and salary-cap calculations now use the same live player feed as `/players`.
- The homepage player count now uses the live database as well.
- Centralized all 40 Major League logos under `public/logos/` using the supplied 2026–27 logo pack and updated every team logo reference to that source.

# 2026–27 Website Rebuild — August 13, 2026

## Current rosters and salary cap — August 24, 2026

- Replaced the player database with the latest 1,909-player skater and goalie files.
- Updated all 40 teams to their complete current 20-player rosters: 12 forwards, six defensemen, and two goalies.
- Updated the `/players` counts to 800 rostered players and 1,109 unrestricted free agents.
- Added AAV to player search results, current team rosters, and player detail panels.
- Added salary sorting to the player database.
- Added live cap-compliance calculations to every team page.
- Applied a $100,000,000 salary cap, $70,000,000 floor, $20,000,000 individual maximum, and $900,000 individual minimum.
- Added payroll, cap position, floor position, rule checks, and compliant/over-cap/below-floor status.
- Validated that every signed player has an AAV, every UFA has a blank AAV, and all individual salaries fall within the permitted range.

## Player database and draft picks — August 20, 2026

- Added a searchable `/players` database containing all 1,909 players.
- Included 1,695 skaters, 214 goalies, 555 rostered players, and 1,354 unrestricted free agents.
- Added filters for AVHL team/status, position group, pro league, minimum overall rating, and sorting.
- Added data-driven 2027 and 2028 first-, second-, and third-round picks to every team page.
- Added future pick-ownership overrides so completed trades can be reflected without rebuilding team pages.
- Removed the closed owner-application link from the homepage and footer while retaining Discord.
- Added Players navigation and updated the homepage player-database count.

## Schedule update — August 18, 2026

- Replaced the schedule placeholder with the complete 1,640-game Major League schedule.
- Added filters for matchup search, team, division, conference, month, exact date, and selected-team venue.
- Added individual 82-game schedule pages for all 40 Major League clubs.
- Added team profile links to each club’s schedule.
- Retained the official schedule CSV and added a validated schedule-data generator for future scores and overtime results.

## Team assets

- Added official 2026–27 assets for all 40 Major League clubs.
- Added 40 logos, 40 arena images, 40 mascot images, and 120 uniform images.
- Created web-optimized WebP copies under `public/teams/<ABBR>/`.
- Verified that all four asset packages use the same set of 40 team abbreviations.

## Team data

- Updated the Major League specifications source file.
- Reduced displayed team data to meaningful, team-specific fields.
- Removed owner spending/success/patience ratings, prestige, market/fan ratings, tax rates, and facility-level sections from team pages.
- Added mascot name/number, team colors, goal horn, goal song, win song, and win presentation.

## Returning players

- Added the supplied 40-tab returning-player workbook as a retained data source.
- Mapped 555 returning players to the correct team pages.
- Added separate skater and goalie roster views.
- Added player detail panels with identity, contract, size, NHL club, season/career production, and selected key ratings.
- Teams with no listed returning players receive a clear empty-state message instead of fabricated roster data.

## Team pages

- Rebuilt team hero sections around the official arena imagery and logo.
- Added club identity and color blocks.
- Added full arena presentation.
- Added Home / Away / Alternate uniform gallery.
- Added official mascot presentation.
- Added division-rival navigation using official logos.
- Added the new returning-player roster section.

## Team directory / homepage

- Replaced abbreviation-only placeholder marks with official team logos.
- Added the mapped returning-player total to the homepage league snapshot.

## Validation

- 40 team records.
- Four divisions of 10 teams each.
- 40 matching roster workbook tabs.
- 555 returning players.
- 240 web image assets (six per team).

## Live draft picks + trade search
- Team draft-pick sections now read current ownership from the live AVHL Pick Tracker Google Sheet (`164tLcxUsyzzylju4QzVNpDL6Abt7OMGk0VZT29MUYW0`).
- Draft-pick ownership updates on team pages without a code/deploy change when the Google Sheet is edited.
- `/trades` now has an instant search field that matches team names, abbreviations, cities, and player names/assets.

## Historical archive + champions
- Replaced the History placeholder with the completed 2022-23 through 2025-26 regular-season archive.
- Added sortable season standings, season leaders, and franchise-lineage notes.
- Added franchise-history tables to current Major League team profiles using stable franchise codes.
- Added `/champions` with championship teams, captains, and 20-player rosters for 2022-23 through 2025-26.

## Historical game archive
- Added the full 6,608-game regular-season archive from 2022-23 through 2025-26 to `/history`.
- Added filters for season, team, opponent, and source date plus oldest/newest ordering and pagination.
- Preserves historical team names and OT/SO labels from the historical workbook.
## Historical standings explorer update
- Historical team-season table can now display one, multiple, or all seasons at once.
- Added Season, GF, and GA columns while preserving each club's within-season rank.
- Added a searchable statistic range filter for PTS, PTS%, W, RW, GF, GA, GD, GF/G, GA/G, and GP.
- All historical table columns remain clickable/sortable across the selected seasons.


## Team year-by-year history
- Expanded every current team page's Franchise History section into a full Year-by-Year Results table.
- Added RW, GF/G, GA/G, GF, GA, and GD alongside GP, W, L, OTL, PTS, and PTS%.
- Historical franchise identities remain linked by franchise code and labeled on the team page.

## 2026-09-04 — Rivals + Saturday Night Showdown update

- Updated the 2026–27 Saturday Night Showdowns to the latest league sheet (31 games across 29 Saturdays, including two-game slates on April 3 and April 10).
- Added a new `/rivals` page and a **Rivals** item to desktop/mobile site navigation.
- Added the full 40-team rivalry matrix with four designated rivals per team, preserving the sheet's Rival 1–4 order and numeric values.
- Added the official Top 10 rivalries ranking.
- Added all seven named multi-team rivalry groups:
  - Rainier Rivalry
  - Big Apple Brawl
  - Southern Scramble
  - Ohio Throwdown
  - Great Lakes Gauntlet
  - Southeast Skirmish
  - Desert Duels
- Replaced the old nine-team divisional-rivals card on every Major League team page with that club's four designated rivals.
- Added a Rivals link to the site footer.
- Simulator files and simulation/replay logic were not changed in this update.

## Site 15 — Rivals UI + Teams navigation cleanup
- Added named rivalry levels: Archrival, Major Rival, Divisional Rival, and Cross-Division Rival.
- Team-page rivals cards now use compact colored level dots and a small legend; removed the duplicate numeric level chips and prevented the card from stretching vertically.
- Simplified the /rivals matrix so Rival 1–4 is communicated by column position and rivalry intensity by colored dot only.
- Removed Minor League from the main header navigation.
- Moved the Minor League directory to /teams/minor-league and added a prominent Minor League Teams button near the top of /teams.
- Kept /minor-league as a redirect for compatibility and updated the footer link.
## Site 16
- Forced every named-rivalry `3 teams` / `4 teams` pill onto one line.
- Removed Southeast Skirmish, leaving six named rivalry groups and a balanced 2×3 layout.
- Moved the rivalry-level key down beside the complete rival matrix where the colored level dots are actually used.
- Restored simulator live-roster initialization. `/sim` now waits for `/api/sim-rosters`, which uses the same live player-sheet loader as the Players/Cap pages, before creating its first game. Current team assignments, names, numbers, and roster composition therefore follow the live AVHL player database when available.
- The V5.2 simulation engine itself remains unchanged; only its matchup roster input is refreshed.


## Site 17 — Rivals layout polish
- Top 10 rivalry rows now distribute evenly through the full height of the ranking card.
- Tightened the complete rivalry matrix so all five columns fit standard desktop widths without a nuisance horizontal scrollbar.
- Reduced rival-cell logo/text spacing slightly while preserving all rivalry data and level dots.
- No simulator or live-roster logic changed from Site 16.
