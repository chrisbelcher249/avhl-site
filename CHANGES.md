# Site 27 — Live bracket fit + standings naming + mobile menu

## Simulator V6.2 — final-summary cleanup

- Removed goalie stat lines from the compact final-summary card; complete goalie statistics remain in Full Game Stats.
- Injury rows now use a roster-style label such as `D Logan Stanley (COL) · Upper Body`, with only `Out 5 games` on the right.
- Removed injury severity text from the compact summary while preserving severity and full injury metadata in the official game packet.
- Renamed the three compact summary boxes to `Final Score`, `Shots On Goal`, and `Shot Attempts`.
- Each compact summary box now orders the larger value first and appends the abbreviation of the team that led that category (for example, `53–39 HOU`); tied categories show no team abbreviation.
- Simulator/version metadata updated to V6.2; the underlying V6 rating/RNG/injury model is unchanged.

## Simulator V6.1 — UI polish + injury visibility

- Removed redundant abbreviation-circle fallbacks from Full Game Stats team/stat headers; team logos stand on their own.
- Full Game Stats tabs now use the actual matchup nicknames (for example, `Cougars Goalies` and `Blood Hounds Skaters`) instead of generic Away/Home labels.
- Removed skater point-leader headlines from the final summary card; that space is now dedicated to goalie lines and injuries because full player stats already live below.
- Injury duration now spells out `Out 1 game`, `Out 6 games`, etc. instead of ambiguous hockey-stat shorthand such as `1G`.
- Injury events are preserved when using jump-to-goal, jump-to-period-end, or jump-to-final controls.
- Injury play-by-play rows now receive a prominent injury treatment so they are difficult to miss.
- Broadcast team nicknames and the Live Game Totals team headers are runtime-fit to their available space, preventing long names such as Hammerheads, Mountain Lions, Blood Hounds, Steamrollers, and Thunderbolts from clipping or colliding with adjacent UI.
- Simulator/version metadata updated to V6.1; the underlying V6 rating/RNG model remains otherwise unchanged.


- Corrected the current standings taxonomy so **Eastern Conference** remains the conference and **Metropolitan Division (MET)** remains the division; the standings UI no longer relabels Metropolitan as EAST.
- Kept **PCF** as the official Pacific Division abbreviation.
- Moved the red Western Conference and Eastern Conference labels directly above each conference's 8/9 qualifier area.
- Tightened and resized the connected Live Bracket so it fits comfortably within normal desktop widths instead of requiring a small horizontal scroll at common screen sizes.
- Repositioned the central projected-playoffs / League Final heading so it no longer collides with round labels.
- Updated the preseason note to show the actual starting record state as **0–0–0**.
- Fixed the mobile top-right navigation menu so selecting a destination closes the open dropdown immediately as navigation begins.
- No simulator, roster, schedule-source, playoff-history, draft, or cap logic was changed.

# Live bracket redesign — September 7, 2026

- Replaced the Live Bracket standings dashboard with one connected playoff bracket spanning both conferences.
- West advances from the left and East advances from the right into a single league final.
- Current projected teams are represented primarily by team logos with small conference seed numbers.
- Preserved the 8/9 and 7/10 qualifier structure and the 1 vs 8/9, 4 vs 5, 2 vs 7/10, and 3 vs 6 Round 1 paths.
- Future-round positions remain visually connected placeholders until results exist.

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

## Site 18 — Permanent player profiles + historical statistics
- Added permanent `/players/[AVHL-ID]` profiles covering all 2,091 known AVHL player IDs.
- Current players show their live/current 2026–27 AVHL team, team logo, jersey number, position, overall rating, age, contract, size, pro club, and ratings when available.
- Historical season rows intentionally do not assign a team; current identity is displayed separately at the top of the player profile.
- Added the supplied skater and goalie career-statistics sources through 2025–26 and generated 1,144 historical stat records (1,028 skaters, 116 goalies).
- Added `/statistics/career` with player search, skater/goalie switching, season filtering, career totals, sorting, pagination, and links to every player profile.
- Rebuilt `/statistics` as the statistics hub with links to current players and the historical archive plus career leader previews.
- Added a Player Career Stats cross-link from `/history` without adding another top-navigation item.
- Player names now link to permanent profiles from `/players`, team rosters, championship rosters/captains, historical-stat tables, statistics leaderboards, and recognized player assets on the Trades page.
- Current players without pre-2026–27 AVHL history retain normal profiles with a clear no-record-yet state; 182 historical-only players retain permanent archive profiles.
## Site 19 — OVR calculation updates
- Team-page Average OVR now uses the top 20 roster players; forward, defense, and goalie averages use the top 12 F, top 6 D, and top 2 G respectively. If a roster/position group is smaller than the target, all available players are used.
- Cap page replaces Team OVR Sum with Top 20 Avg OVR, rounded to one decimal.
- Cap/floor action amounts now show two decimal places in millions (for example, $0.25M below floor).


## Site 20 — Draft tab
- Added a new top-navigation **Draft** tab at `/draft`.
- Added a live embedded Google Sheets draft-capital board using the AVHL master draft-pick spreadsheet.
- Added an **Open in Google Sheets** fallback button.
- Added Draft to the site footer.

## Site 21 — Draft Capital redesign + sortable team rosters
- Replaced the `/draft` Google Sheets embed with a native AVHL Draft Capital experience. The page now pulls the live pick tracker data server-side and renders it entirely in the AVHL website design; no spreadsheet iframe or Google Sheets link is displayed.
- Added 2027/2028 draft-year switching, round and ownership filters, team/pick search, live league summary cards, and branded team draft-capital cards with original-team logos and ownership-history context for traded picks.
- Draft data remains live through the existing AVHL pick-tracker CSV feed, so pick ownership changes do not require a site-data rebuild.
- Made every visible column on Major League team roster tables sortable: jersey number, player name, position, OVR, age, years left, AAV, current-season production/SV%, and career production/SV%.
- Added clear sort-direction indicators and proper alphabetical/numeric ordering. Skater/goalie switches reset to the default OVR-descending view.

## Site 22 — Historical playoff brackets + Info archive structure
- Reorganized league archival pages beneath `/info`: History now lives at `/info/history` and Champions at `/info/champions`.
- Removed History and Champions from the top navigation so League Info acts as their parent section; added archive cards for History, Playoff Brackets, and Champions to `/info`.
- Kept `/history` and `/champions` as redirects for compatibility, and added `/history/brackets` as a redirect to the canonical bracket archive.
- Added `/info/history/brackets` with standardized interactive historical brackets for all four completed postseasons (2022–23 through 2025–26).
- Preserved the actual playoff format used each season: 16 teams with division/wild-card labels in 2022–23, 24 teams/12 conference seeds in 2023–24, and the 20-team/10-seed conference format in 2024–25 and 2025–26.
- Preserved historical team names and seeds, all series scores shown by the original 2023–24 and 2024–25 bracket records, and advancement-only presentation where scores were not retained (2022–23 and 2025–26).
- Added consistent AVHL styling, team logos, winner emphasis, bracket connector lines, season switching, champion presentation, and current Major League team links where the historical franchise maps to a current Major club.
- Team-page Average OVR cards now force `Forwards · Top 12` onto one line, matching the other three rating labels.
- Simulator files and live-roster hookup are unchanged from Site 21.

## Site 23 — Restored playoff series scores
- Restored every missing 2022–23 playoff series score from the official 2022–23 playoff schedule CSV (15 series).
- Restored every missing 2025–26 playoff series score from the official 2025–26 playoff schedule CSV (19 series).
- 2022–23 is now presented as best-of-seven throughout; 2025–26 qualifiers are best-of-five and all later rounds are best-of-seven.
- The `/info/history/brackets` archive now has complete series scores for all four historical playoff seasons.
- Retained clean copies of both official schedule CSVs under `data/source/` for provenance.
- No bracket structure, team mapping, simulator logic, live-roster logic, or other site behavior was changed.

## Site 24 — Standings redesign + live playoff bracket
- Rebuilt `/standings` around one five-way segmented toggle: **League / Conference / Division / Wild Card / Live Bracket**.
- League view shows the complete 1–40 table with all core standings and tiebreaker metrics.
- Conference view shows all 20 Western and all 20 Eastern clubs side by side on desktop.
- Division view shows all four 10-team divisions in a 2×2 desktop layout and uses **PCF** (not PAC) for the Pacific Division; the fourth division is presented as **EAST**.
- Wild Card view shows the top three teams in each division plus the four current wild cards for each conference.
- Added a live playoff-bracket projection using the current 10-team-per-conference format: division winners seed 1–2, second-place clubs 3–4, third-place clubs 5–6, and wild cards 7–10.
- Replaced the old standings sort order with the official 2026–27 tiebreaker sequence: **PTS → PTS% → RW → W → GF/G → GA/G (lower) → GD**.
- Added `/standings/tiebreakers` and a Tiebreakers button near the main standings view toggle.
- All tables, wild-card selection, and live-bracket seed ordering share the same centralized standings comparator and continue to update from the live official schedule feed.

## Site 25 — Wild-card race depth + preseason bracket preview
- Extended each conference's Wild Card view with an **Outside Looking In** section containing the remaining 10 teams, labeled 11–20.
- Kept the existing top-three divisional qualifiers and four wild-card spots intact above that section.
- Removed the first-game gate from **Live Bracket** so both 10-team conference brackets populate immediately, including before any 2026–27 games are completed.
- Added a small preseason-preview notice when the schedule has zero completed games; once results exist, the same bracket continues updating from live standings automatically.
- No simulator, roster, schedule-source, cap, history, draft, or playoff-history logic was changed.


## Site 26 / Simulator V6.0 — Live full ratings + injuries
- Rebuilt the simulator's player-rating pipeline around the same live Google Sheets CSV source used by the Players and team pages. `/api/sim-rosters` now exposes the complete simulator-relevant skater and goalie rating sets plus age/size/type metadata.
- Removed the V5.2 synthetic line-tier rating generation. V6 reads the actual player attributes from the live roster feed; Overall is retained mainly for automatic lineup ordering and as a missing-value fallback rather than a hidden universal outcome modifier.
- Expanded skater simulation use to all 26 supplied attributes: Deking, Hand Eye, Passing, Puck Control, Discipline, Offensive Awareness, Poise, both slap-shot ratings, both wrist-shot ratings, Defensive Awareness, Faceoffs, Shot Blocking, Stick Checking, Acceleration, Agility, Balance, Endurance, Speed, Aggressiveness, Body Checking, Durability, Fighting Skill, and Strength.
- Expanded goalie simulation use to all 20 supplied attributes: Angles, Breakaway, Five Hole, Glove High/Low, Stick High/Low, Passing, Poise, Poke Check, Puck Playing Frequency, Rebound Control, Recover, Aggressiveness, Agility, Durability, Endurance, Speed, and Vision.
- Reweighted entries, breakouts, passes/interceptions, screens, blocks, shot selection/accuracy/power/targeting, goalie saves/rebounds/puck play, skating, loose-puck races, hits, penalties, faceoffs, clears, and fights around event-specific multi-rating matchups instead of synthetic player tiers.
- Applied the AVHL unfamiliar-position rule inside the simulator: a skater used at an unlisted position within the same general group receives a 3% penalty only to Offensive Awareness, Defensive Awareness, Passing, and Puck Control.
- Added seeded, event-driven injuries from hits, blocked shots, fights, long-fatigue shifts, and close-range goalie collisions. Durability is the primary susceptibility/severity rating, with fatigue, event impact, and a small age component.
- Injured skaters leave the active unit immediately and line selection rebuilds around healthy players. Injured starting goalies now trigger a real backup-goalie substitution and goalie-change event.
- Added injury details and rating-model metadata to the official packet; bumped the official schema to `avhl-official-game-v2`.
- Added injury/man-games-lost rows and player injury/familiarity indicators to the simulator box score and final summary.
- Regenerated the bundled fallback player database from the September 8, 2026 skater/goalie files so live-source outages no longer revert to the older August roster state.
- Added `V6_RATING_MODEL.md` and `scripts/test-simulator-v6.mjs` documenting and validating the full rating/RNG model, exact rating identity, seeded repeatability, and injury calibration.