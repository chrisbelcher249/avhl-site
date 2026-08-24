# AVHL 2026–27 Website

Official 2026–27 American Virtual Hockey League website project built with Next.js 16 and Tailwind CSS 4.

## Included in this build

- 40 Major League team directory with official logos
- Fully branded team pages with arena hero imagery
- Official Home / Away / Alternate uniform galleries
- Official mascot imagery and mascot names/numbers
- Team-specific colors and arena presentation details
- Complete current rosters for all 40 teams: 20 players per club, including 12 forwards, six defensemen, and two goalies
- Skater and goalie roster views with AAV, contract term, player details, production, and key ratings
- Searchable database of all 1,909 players, including 800 signed players and 1,109 unrestricted free agents
- Player filters for AVHL status/team, position group, pro league, and overall rating, plus salary sorting
- Team salary-cap compliance using a $100,000,000 cap, $70,000,000 floor, $20,000,000 maximum salary, and $900,000 minimum salary
- Complete 1,640-game Major League schedule with team, division, conference, month, date, and venue filters
- Individual 82-game schedule pages for all 40 teams
- Data-driven 2027 and 2028 draft-pick inventory on every team page
- AVHL Discord link retained; closed owner application removed
- Existing league Info, Standings, Statistics, and History routes retained for future data feeds

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

The five supplied source files are retained in `data/source/`:

- `major-team-specifications-2026-27.csv`
- `major-league-schedule-2026-27.csv`
- `returning-players-2026-27.xlsx`
- `player-ratings-skaters-2026-27.csv`
- `player-ratings-goalies-2026-27.csv`

Generated application data lives in:

- `data/teams.js`
- `data/schedule.js`
- `data/returningPlayers.js`
- `data/players.js`
- `data/salaryCap.js`
- `data/draftPicks.js`

To regenerate those files, run:

```bash
python scripts/generate-site-data.py
```

That helper requires Python with `openpyxl` installed.

To regenerate the schedule data after adding scores or overtime results to the schedule CSV, run:

```bash
python scripts/generate-schedule-data.py
```

To regenerate the complete player index from the skater and goalie ratings CSVs, run:

```bash
python scripts/generate-player-data.py
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
