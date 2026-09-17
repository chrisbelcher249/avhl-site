# 2026-27 live schedule + stats setup

The 2026-27 site uses one Google workbook as the season source of truth:

- `Schedule` — official 1-1640 fixture list (`Game ID`, `Day`, `Date`, `Away Team`, `Home Team`)
- `Team Stats` — two rows per completed game
- `Skater Stats` — one row per dressed skater per completed game
- `Goalie Stats` — one row per dressed goalie, including backups with 0:00 TOI

The production workbook ID is already configured in `src/lib/seasonSheets.js`. It can be overridden with `AVHL_SEASON_SHEET_ID`.

## Public read access

The website reads the four tabs through Google Sheets CSV output with `cache: no-store`. The workbook therefore needs to remain readable by the deployed site (the current shared-link/public-read setup is sufficient).

The site aggregates the game-by-game rows at request time. No separate season-total sheet is required. Skater S%, FO%, goalie SV%, and GAA are recalculated from season totals rather than averaging game percentages.

## Verified SIM write access

Verified SIM games write directly to the three stats tabs. The write endpoint never edits the `Schedule` tab; it uses that tab only to verify that Game # and matchup agree.

1. In Google Cloud, create/select a project and enable **Google Sheets API**.
2. Create a **service account** and a JSON key.
3. Share the 2026-27 season workbook with the service account's `client_email` as **Editor**.
4. Add these environment variables in Vercel:
   - `GOOGLE_SHEETS_CLIENT_EMAIL` = the service account `client_email`
   - `GOOGLE_SHEETS_PRIVATE_KEY` = the service account `private_key` (the `\\n` escaped form from JSON is accepted)
   - optional `AVHL_SEASON_SHEET_ID` = workbook ID if using a staging copy
5. Redeploy after saving the environment variables.

The existing Commish password remains controlled by the site's existing simulator export/admin credential logic.

## Official SIM flow

1. Finish a simulation.
2. Click **Verify Official Game**.
3. Enter the Commish password.
4. Enter Game # `1` through `1640`.
5. The server looks up that Game # from the live `Schedule` tab and requires the away/home matchup to match the simulation.
6. **Save Official Result** appends the game to the next unused rows in `Team Stats`, `Skater Stats`, and `Goalie Stats`.
7. A Game ID already present in any stats tab is rejected, so an official game cannot be saved twice accidentally.

Player IDs are normalized to four text digits (`1` -> `0001`, `174` -> `0174`). Both dressed goalies are written, including a backup with `0:00`, `0` SA/SV, `0.000` SV%, and `0.00` GAA.

## SNS games

SNS / EA games can be entered manually into the same three stats tabs using the same columns. Once both `Team Stats` rows for a Game ID are present and consistent, the website treats that game as final and joins the result back to the static fixture in `Schedule`.

For an OT or shootout loss to count correctly in standings, enter `Finish` as `OT` or `SO` on both team rows. Use `REG` for regulation finals.
