# AVHL 2026–27 Season Futures — exact V7 sample-backed markets

## Game engine is the only score generator

The full season-futures system uses **780 distinct unordered pairings** of the
40 AVHL Major League teams. For each pair it stores **100 actual V7 physics
simulations**, 50 with one team at home and 50 with the other team at home.
The initial sample database therefore requires **78,000 real V7 games**.

Each individual score, result, and overtime flag comes directly from
`AVHLGameSimulator.simulateScoreOnly()`, which runs the same on-ice
mechanics as the full V7 event simulator. The score-only mode does not
substitute an independent Poisson or standings-based prediction formula.
Saved game outcomes are resampled (with their original home orientation)
into 10,000 synthetic **seasons**. This avoids replaying 1,640 full physics
games for every season scenario while keeping the simulated results
grounded in actual V7 outcomes.

The published regular-season results and official AVHL league standings
and playoff rules are preserved. The live forecast covers win totals,
expected points, division and conference titles, Presidents' Trophy,
playoff qualification and advancement, Cup and bottom-three relegation.

## Required coverage and publication

All **780 pairs with both 50-game home orientations** must be complete
before ANY new season-futures prices are published. When cached outcomes
are missing, the API returns HTTP 503 with a completed-pair count; the UI
shows a progress bar rather than falling back to the old standings-only
model. A new lineup/roster/engine fingerprint invalidates any outdated
futures forecast.

The **individual game/player odds 1,000-game requirement remains
unchanged**. The 100-game-per-pair database is for season futures, not
a replacement for the full game-odds sample threshold.

## Every 30 minutes, only changed matchups

The GitHub Actions workflow
`.github/workflows/refresh-v7-futures.yml` checks every 30 minutes:

1. Get current official live roster/player ratings/owner lineups.
2. Hash both complete V7 matchup configurations for all 780 pairs plus
   the V7 simulator source. The pair hash changes only when the game
   engine or relevant team lineup/roster/player ratings change.
3. Compare each pair against previously stored 50+50 game outcomes in
   Vercel's existing Redis cache.
4. Simulate **only missing or changed pairs**, split into shards of up to
   10 pairings across at most sixteen parallel GitHub Actions jobs.
5. Once all current fingerprints are complete, resample the 10,000
   remaining-season/whole-playoff scenarios with the newest official
   scores and publish one compact, versioned, time-stamped forecast.

Existing unchanged V7 game samples are reused. New official game results
do not require new V7 physics simulations; they do require a new season
projection. The schedule check is every 30 minutes, but cold simulation
jobs can take substantially longer and scheduled runs may be delayed.

Workers authenticate using GitHub Actions OIDC. Vercel verifies the
signed workload identity for the exact repository, approved workflow
and main branch before accepting results. Redis credentials never leave
the server. A 50+50 pair is ingested atomically; partially simulated pairs
are withheld.

## Accuracy and uncertainty

Real V7 outcomes are a substantial improvement over invented
standings-only probabilities. Nevertheless, **100 games per pairing is
a noisy initial sample**. For a 50%-probability matchup, the approximate
95% sampling margin is ±9.8 percentage points at 100 games overall;
home-specific estimates based on only 50 simulations have wider
uncertainty. Rare playoff/Cup/relegation outcomes have additional error
because they are built from those empirical distributions.

We should eventually increase and adaptively refine these samples,
and validate the forecast against subsequent real V7 games.

There is **no claim that 10,000 complete V7 physics seasons were run**.
The 10,000 complete *season scenarios* draw from the 78,000 actual V7
game outcomes. All moneylines are fair model conversions without a
sportsbook margin.

## Official league rules

Forty teams, four divisions, 82 games per club, 1,640 regular-season
games. Standings follow the site's official tiebreakers. Each
scenario has four division champions, one Presidents' Trophy winner,
20 playoff qualifiers (10 per conference), a best-of-five 7–10
qualifier, a 16-team Round 1, best-of-seven subsequent rounds, one
Cup champion, and exactly **three relegated teams** (league ranks 38–40).

## Release checks

- Pair helpers verify 40-team/780-pair coverage and exactly 50 outcomes
  for each home orientation.
- The signed publishing endpoint rejects unauthorized, incomplete and
  mismatched snapshots; a single pair cannot produce public futures.
- The forecast verifies all 780 pair pools before projecting any game;
  never creates score outcomes from team ratings or historical standings.
- The existing site and hockey simulator regression suites must pass.
- Live V7 smoke tests produce real scores for both home orientations.
- Initial precomputation is **substantial** (78,000 full games). No
  forecast is presented until the cache is genuinely ready.
