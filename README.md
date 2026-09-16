# AVHL 2026–27 Website

Official 2026–27 American Virtual Hockey League website project built with Next.js 16 and Tailwind CSS 4.

## Included in this build

- 40 Major League team directory with official logos
- 40-team Minor League directory nested under `/teams/minor-league`
- Official rivalry system with four designated rivals per Major League team, rivalry levels, Top 10 rivalries, and named rivalry groups
- Integrated V6.7.3 lineup/simulator site build at `/sim`
- Updated Saturday Night Showdown schedule
- Fully branded team pages with arena hero imagery
- Official Home / Away / Alternate uniform galleries
- Official mascot imagery and mascot names/numbers
- Team-specific colors and arena presentation details
- Complete current rosters for all 40 teams, with owner-controlled 20-player dressed lineups (12 forwards, six defensemen, and two goalies) plus automatic scratches
- Skater and goalie roster views with sortable number/name/position/OVR/age/contract/AAV/production columns
- Searchable current-player database sourced from the live AVHL ratings CSVs
- Permanent player profiles for all 2,091 known AVHL IDs, including 182 historical-only players
- Historical player statistics from 2022–23 through 2025–26 at `/statistics/career` (1,028 skaters and 116 goalies)
- Player filters for AVHL status/team, position group, pro league, and overall rating, plus salary sorting
- Team salary-cap compliance using a $100,000,000 cap, $70,000,000 floor, $20,000,000 maximum salary, and $900,000 minimum salary
- Complete 1,640-game Major League schedule with team, division, conference, month, date, and venue filters
- Live 2026–27 standings with League, Conference, Division, Wild Card, and a fully connected Live Bracket view plus the official seven-step tiebreaker system; Wild Card includes 11–20 Outside Looking In, the bracket previews even before Game 1, and current divisions are correctly identified as PCF/CEN/ATL/MET
- Individual 82-game schedule pages for all 40 teams
- Native live Draft Capital board at `/draft` for 2027 and 2028, plus data-driven pick inventory on every team page
- AVHL Discord link retained; closed owner application removed
- Statistics hub with linked current-player and historical-career sections; History cross-links to the player archive
- League archive nested under `/info`, with History at `/info/history`, Champions at `/info/champions`, and standardized playoff brackets at `/info/history/brackets`
- Historical playoff brackets for 2022–23 through 2025–26 with season-specific formats, seeds, preserved scores, historical names, team marks, and champions


## V6.7.3 lineup presentation

- Public player cards now render as true full grid cards, fixing the collapsed/inline presentation on forward and defense units.
- OVR, role, player identity and team-color accent are contained within each card with tighter, consistent spacing across every lineup section.
- The team selector is strict alphabetical order by full displayed team name.
- The macro lineup layout and all owner-editing/simulator rules are unchanged.

## V6.7.1 pre-deploy lineup integrity

- A new game will not begin if the simulator cannot refresh the latest roster + owner-lineup state before its first event. Play, jump controls, team changes, seed reloads, recent-game restores, New Game and initial game creation all use the same guard.
- Matchup creation is also fail-closed after refresh: if either selected team cannot apply its verified lineup, no control is allowed to continue using the previous game snapshot.
- `/api/sim-rosters` is the single simulator lineup source. The browser no longer invents an automatic replacement lineup if the validated server record cannot be applied exactly.
- Production simulation requires configured Redis/KV lineup persistence and a complete live player-roster response. Storage outages, missing persistence configuration, or partial/fallback roster data fail closed instead of silently becoming game inputs.
- If an existing owner-saved lineup becomes invalid after a roster transaction, the public page shows a repairable projection, but the simulator refuses that team until the owner saves a valid replacement.
- Owner saves require the complete live roster and the revision the editor originally loaded. Production Redis persistence compares that revision and writes the replacement atomically, so stale or simultaneous tabs receive a conflict rather than overwriting a newer save.
- Owner editing is disabled while persistent storage or the live roster source is unavailable; public viewing remains available with a visible warning.
- Replacing a dressed skater with a scratch automatically transfers that outgoing player's PP/PK/OT/shootout references to the replacement; simple swaps between dressed players keep unit assignments attached to the players.
- Public and edit lineup layouts were browser-rendered across 320–1440 px with no horizontal overflow. Five shootout cards remain in one row on desktop and stack cleanly on mobile, and the lineup uses exactly two OT groups.
- Dedicated tests cover all 40 team lineup projections and the full server-record → simulator normalization handoff, including PP/PK/OT/shootout preservation and fail-closed malformed data.

## Simulator V6.7 scoring replay presentation

- Goal replay selector now uses a two-line scoring presentation: period/time, scoring team, scorer in-game goal total, and score after the goal on line one; credited assists with in-game assist totals on line two.
- The displayed scoring totals are cumulative within the current simulated game and are intended as placeholders until season statistics are connected.

- Goal assist sequences now use the league target mix: 6% unassisted, 16% one assist, and 78% two assists.
- Completed setup passes are recorded before puck-flight possession is cleared, fixing the bug that silently discarded passers from the assist queue.
- Two-assist setups require two distinct passers (A → B → C), preventing a return pass from incorrectly collapsing a two-assist play into one assist.
- Goal events, player assist/point totals, replay roles, replay dropdown labels, and play-by-play now all use the same credited-assist IDs.
- Replay reconstruction begins with the credited scoring sequence so an unassisted label cannot visibly show a contradictory setup pass.
- Saved-shot recoveries preserve the shooter as a legitimate prior touch for rebound assists.

## Simulator V6.3 polish

- Full Game Stats tabs use the actual matchup nicknames rather than generic Away/Home labels.
- Redundant abbreviation-circle fallbacks were removed from box-score stat headers.
- The compact final summary now contains only the three game-total boxes plus injuries; goalie and skater detail stays in Full Game Stats.
- Final-summary boxes are labeled `Final Score`, `Shots On Goal`, and `Shot Attempts`, sort the larger value to the left, and append the leading team's abbreviation.
- Injury rows use position + player + team, for example `D Logan Stanley (COL) · Upper Body`, with only the spelled-out absence (`Out 5 games`) on the right.
- Injury events remain visible when skipping ahead.
- Long team nicknames are fitted dynamically in the broadcast scoreboard and Live Game Totals headers so all 40 Major teams present cleanly.

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

Standalone regression checks (no browser needed):

```bash
npm run test:lineups
npm run test:lineup-storage
npm run test:sim-lineups
npm run test:sim
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
- `/sim` loads matchup rosters through `/api/sim-rosters`, backed by the same live Google Sheets player loader used by Players and Cap. For official lineup-driven simulation, that API now requires the complete live skater + goalie response and persistent lineup storage; it does not start a new game from bundled/demo roster fallbacks when either source of truth is unavailable.
- The V6.7.1 simulator uses the full live player-rating set, event-driven injuries, polished injury reporting, matchup-specific stat tabs, and runtime fitting for long team names.

### Owner lineups
Each Major League team now has a public lineup subpage at `/teams/[team-slug]/lineup`. If no valid owner lineup has been saved, the page projects one from the live roster. The team-specific **Owner? Sign In Here to Edit Lineup** button unlocks same-page editing after server-side password verification. The old plural lineup URLs remain redirect-only compatibility routes. Only salted PBKDF2 hashes are stored in the project; plaintext owner passwords are not shipped to the browser or written into the repository.

Saved lineups enforce 12F/6D/2G dressed, forward-only LW/C/RW slots, defense-only LD/RD slots, one starter/one backup, PP units of 4F/1D or 3F/2D, PK units of 2F/2D, two OT groups of 2F/1D, and five unique shootout shooters. Same-position-group off-position assignments remain legal and the simulator applies the existing 3% familiarity penalty to the specified inputs. In edit mode, owners can drag players between legal destinations (including dressed ↔ scratch swaps) or use the existing dropdown selectors as the mobile/accessibility fallback.

Production persistence uses an Upstash/Redis REST store. Connect either `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or the Vercel Marketplace custom-prefix pair `UPSTASH_REDIS_REST_KV_REST_API_URL` + `UPSTASH_REDIS_REST_KV_REST_API_TOKEN` in the deployment. Local development falls back to `.avhl-lineups.dev.json`. New simulator games refresh `/api/sim-rosters` immediately before the opening faceoff and consume the same saved lineup record used by the public page, so owner saves and simulator lineups cannot drift into separate copies.

## Live team branding diagnostics

Major-team identity data is loaded from the public 2026-27 Team Specifications Google Sheet at runtime. The loader tries multiple anonymous Google CSV endpoints and does not assume a specific worksheet gid. The bundled `data/teams.js` remains a final fail-safe. After deployment, `/api/teams` can be used as a quick health check: `source` should be `live`, `liveTeamCount` should be 40, and `endpoint` identifies the Google CSV route that succeeded.
