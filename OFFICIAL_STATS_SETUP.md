# 2026–27 Official Stats Workbook Setup

The site reads the 2026–27 season from Google Sheet:

`1oE_GTm72iMRlTAZBZTBw305vBWnGUeJfY7_fGvcWr5M`

Expected tabs (exact names):

- `Schedule`
- `Team Stats`
- `Skater Stats`
- `Goalie Stats`

## Public read access

The site reads all four tabs with the Google Sheets CSV endpoint. The workbook must remain accessible to the deployed site (for example, Anyone with the link can view).

## Official simulator write access

The Commish save is server-side and uses the Google Sheets API. It never exposes Google credentials in the browser.

1. In Google Cloud, create or choose a project.
2. Enable **Google Sheets API**.
3. Create a **service account**.
4. Create a JSON key for that service account.
5. Share the AVHL stats workbook with the service account email as **Editor**.
6. In Vercel Project Settings → Environment Variables, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = the service account `client_email`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = the service account `private_key`
7. Redeploy.

The server supports either literal PEM newlines or `\\n`-escaped newlines in the private key environment variable.

## Official game workflow

1. Finish a simulator game.
2. Click **Verify Official Game**.
3. Enter the Commish/admin password.
4. Enter official Game ID `1`–`1640`.
5. The site checks the `Schedule` tab to confirm the simulated away/home matchup.
6. **Save Official Result** appends:
   - 2 rows to `Team Stats`
   - 36 skater rows to `Skater Stats`
   - all 4 dressed goalies to `Goalie Stats` (including unused backups)
7. The API rejects a Game ID already present in `Team Stats`.

The write uses the next open row in each stat tab and does not clear or replace previous games.
