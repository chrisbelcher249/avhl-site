# AVHL 2026–27 Website

Official 2026–27 American Virtual Hockey League website project built with Next.js 16 and Tailwind CSS 4.

## Included in this build

- 40 Major League team directory with official logos
- 40-team Minor League directory nested under `/teams/minor-league`
- Official rivalry system with four designated rivals per Major League team, rivalry levels, Top 10 rivalries, and named rivalry groups
- Integrated V5.2 simulator at `/sim`
- Updated Saturday Night Showdown schedule
- Fully branded team pages with arena hero imagery
- Official Home / Away / Alternate uniform galleries
- Official mascot imagery and mascot names/numbers
- Team-specific colors and arena presentation details
- Complete current rosters for all 40 teams: 20 players per club, including 12 forwards, six defensemen, and two goalies
- Skater and goalie roster views with sortable number/name/position/OVR/age/contract/AAV/production columns
- Searchable database of all 1,909 current players, including 800 signed players and 1,109 unrestricted free agents
- Permanent player profiles for all 2,091 known AVHL IDs, including 182 historical-only players
- Historical player statistics from 2022–23 through 2025–26 at `/statistics/career` (1,028 skaters and 116 goalies)
- Player filters for AVHL status/team, position group, pro league, and overall rating, plus salary sorting
- Team salary-cap compliance using a $100,000,000 cap, $70,000,000 floor, $20,000,000 maximum salary, and $900,000 minimum salary
- Complete 1,640-game Major League schedule with team, division, conference, month, date, and venue filters
- Live 2026–27 standings with League, Conference, Division, Wild Card, and Live Bracket views plus the official seven-step tiebreaker system
- Individual 82-game schedule pages for all 40 teams
- Native live Draft Capital board at `/draft` for 2027 and 2028, plus data-driven pick inventory on every team page
- AVHL Discord link retained; closed owner application removed
- Statistics hub with linked current-player and historical-career sections; History cross-links to the player archive
- League archive nested under `/info`, with History at `/info/history`, Champions at `/info/champions`, and standardized playoff brackets at `/info/history/brackets`
- Historical playoff brackets for 2022–23 through 2025–26 with season-specific formats, seeds, preserved scores, historical names, team marks, and champions

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Build check

```bash
npm run build
```

## Data sources

The supplied source files are retained in `data/source/`:

- `major-team-specifications-2026-27.csv`
- `major-league-schedule-2026-27.csv`
- `returning-players-2026-27.xlsx`
- `player-ratings-skaters-2026-27.csv`
- `player-ratings-goalies-2026-27.csv`
- `player-career-stats-skaters-through-2025-26.csv`
- `player-career-stats-goalies-through-2025-26.csv`

Generated application data lives in:

- `data/teams.js`
- `data/schedule.js`
- `data/returningPlayers.js`
- `data/players.js`
- `data/playerHistory.js`
- `data/salaryCap.js`
- `data/draftPicks.js`
- `data/playoffBrackets.js`

To regenerate those files, run:

```bash
python scripts/generate-site-data.py
```

That helper requires Python with `openpyxl` installed.

To regenerate the schedule data after adding scores or overtime results to the schedule CSV, run:

```bash
python scripts/generate-schedule-data.py
```

To regenerate the complete current-player index from the skater and goalie ratings CSVs, run:

```bash
python scripts/generate-player-data.py
```

To regenerate historical player statistics from the career-statistics CSVs, run:

```bash
python scripts/generate-player-history.py
```

## Images

Deployment-friendly WebP copies are stored under `public/teams/<ABBR>/` with this pattern:

- `logo.webp`
- `arena.webp`
- `mascot.webp`
- `home.webp`
- `away.webp`
- `alt.webp`

The full-resolution master ZIPs should remain archived separately. The site copies are intentionally optimized for web delivery and do not replace the master artwork.

## Team-page data policy

The site intentionally excludes repetitive franchise-management fields that are identical across teams, including owner spending/success/patience ratings, prestige, taxes, and facility levels. Team pages focus on information that differentiates clubs and is useful to visitors.

## Site 16 updates

- Named rivalry team-count pills are locked to one line.
- Southeast Skirmish was removed, leaving six named trio/quad rivalry groups.
- The rivalry-level legend now sits with the full four-rival matrix where the colored dots are used.
- `/sim` now loads matchup rosters through `/api/sim-rosters`, backed by the same live Google Sheets player loader used by Players and Cap. If Google Sheets is temporarily unavailable, the site's bundled player database is used by that loader; the simulator's original two demo pools remain the last-resort fallback only if the API route itself fails.
- The V5.2 simulation engine is unchanged by the roster hookup.
