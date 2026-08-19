# AVHL 2026–27 Website

Official 2026–27 American Virtual Hockey League website project built with Next.js 16 and Tailwind CSS 4.

## Included in this build

- 40 Major League team directory with official logos
- Fully branded team pages with arena hero imagery
- Official Home / Away / Alternate uniform galleries
- Official mascot imagery and mascot names/numbers
- Team-specific colors and arena presentation details
- 555 returning players mapped to their 2026–27 clubs
- Skater and goalie roster views with player detail panels and key ratings
- Complete 1,640-game Major League schedule with team, division, conference, month, date, and venue filters
- Individual 82-game schedule pages for all 40 teams
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

The three supplied source files are retained in `data/source/`:

- `major-team-specifications-2026-27.csv`
- `major-league-schedule-2026-27.csv`
- `returning-players-2026-27.xlsx`

Generated application data lives in:

- `data/teams.js`
- `data/schedule.js`
- `data/returningPlayers.js`

To regenerate those files, run:

```bash
python scripts/generate-site-data.py
```

That helper requires Python with `openpyxl` installed.

To regenerate the schedule data after adding scores or overtime results to the schedule CSV, run:

```bash
python scripts/generate-schedule-data.py
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
