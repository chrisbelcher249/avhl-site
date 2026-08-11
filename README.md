# AVHL Website — 2026–27 Rebuild

This is the cleaned 2026–27 AVHL website project. It is a Next.js App Router site styled with Tailwind CSS.

## What is included

- 40 Major League teams
- Western Conference: Pacific + Central
- Eastern Conference: Atlantic + Metropolitan
- 10 clubs per division
- Searchable/filterable `/teams` directory
- Dynamic team pages at `/teams/[slug]`
- Team profiles generated from the official Major League specification CSV
- Consistent site header/footer and responsive layout
- Prepared pages for standings, schedule, statistics, history, and league info

## Team data

The original source file is kept at:

`data/source/major-team-specifications-2026-27.csv`

The website uses:

`data/teams.js`

If the CSV changes, regenerate the website data with:

```bash
python scripts/generate-teams.py
```

The script validates that there are exactly 40 clubs and exactly 10 teams in each division.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production check

```bash
npm run build
```

## Deploy

If the GitHub repository is still connected to Vercel, commit and push these project files to the repository. Vercel should build and deploy the new version automatically.

## Notes

The detailed raw NHL customization fields remain preserved in the source CSV. The public team pages intentionally surface the useful fan-facing information (identity, arena, market, fan profile, ownership, facilities, colors) rather than exposing hundreds of editor-only configuration columns.
