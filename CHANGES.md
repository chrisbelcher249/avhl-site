# 2026–27 Website Rebuild — August 13, 2026

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
