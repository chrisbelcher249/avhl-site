# AVHL Simulator V7 — Development and calibration

Status: **DRAFT / NOT FOR LIVE DEPLOYMENT**. V6 remains the live version until V7 passes statistical and regression testing. The 408 completed 2026–27 games and official replay archives must remain unchanged.

## Scope
1. Manpower-aware PP/PK zone possession, passing, and shot creation, with genuine shorthanded opportunities retained but rare.
2. Nonlinear ratings-based elite puck involvement and shooting; preserve specific ratings, player deployment choices, and team differences.
3. Positional finishing/shooting based on spatial shot quality and forward vs defenseman tendencies.
4. Three-on-three OT tactics and resolution without forcing a scripted result.
5. League scoring, shot volume, shutouts and reasonable empty-net pull thresholds.

**Do not modify** injury rules, home-ice model, historical records, roster/lineup settings, or contract/cap data. Owner-selected PP/PK, overtime and shootout groups remain authoritative.

## Historical V6 benchmark
Using the original season Game Stats workbook, 401 SIM games (exclude 7 SNS games):
- 2.59 actual goals/team/game (2.66 scoreboard goals includes shootout credits).
- 24.65 shots/team/game; 8.26% PP; 141 shorthanded goals (0.352 per game).
- 32.2% of skater goals from defensemen.
- 76 tied-after-regulation games, 22 OT winners and 54 shootouts.
- 74 games with at least one shutout; 197 empty-net goals.

## Paired-seed regression harness
`node scripts/calibrate-simulator-v7.mjs 80` compares the unchanged `main` implementation and this branch on identical bundled official-team rosters, matchups and seeds, with one full replay plus headless Monte Carlo. Run under the PR workflow, which fetches the base branch for comparison. See log for paired distributions, including PP attempts, offensive shots by manpower, position shares, goalie results, elite scoring, and OT splits.

The long-run sample is a *calibration experiment*, not a guarantee that any small sample must exactly match an NHL average. Use larger and multiple-seed validations before production; inspect player-level top-end distribution and replay quality separately.

## Intended acceptance checks
- NHL-like PP efficiency without an artificially hard-coded winner or goal.
- SHG frequency substantially lower than V6, while allowing exceptional PK counterattacks.
- Defenseman goal and shot shares reasonably NHL-like, with defensemen still contributing to offense.
- OT goals materially more likely than V6, with normal three-on-three deployment and 4v3/5v3 exceptions preserved.
- Superstar involvement and scoring meaningfully distinguished from mid-tier players by *actual abilities*, not score overrides.
- Maintain deterministic seeds; total goals/shots and all PP/SHG, goalie, shootout, roster and replay records reconcile.
- All original prebuild tests, simulator integration tests, and PR regression tests pass.

## Release gate
Do not merge or deploy this PR automatically. Review benchmark results and test multiple official lineup variants, injury interruptions, empty-net edge cases, penalty expirations and replay formats first.
