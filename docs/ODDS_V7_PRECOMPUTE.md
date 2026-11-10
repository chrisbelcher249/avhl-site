# AVHL odds — production V7 Monte Carlo

## Published game odds

All game and player markets are derived exclusively from **complete V7 game
simulations** with the official roster, selected line combinations, starting
goalies and current player ratings. The app never computes a synthetic score
as an odds shortcut. The win percentages are actual event frequencies.

A minimum of **1,000 complete V7 games** is required before the site's game
odds page can publish any numerical model prices. A 12-game Vercel *preview*
mode allows UI testing, but 12 samples never satisfy the public gate.

The game page is a **read-only cache consumer**: opening it does not start
expensive gameplay computation on a visitor's device. The site checks
the Upstash Redis summary cache. When its fingerprint has no 1,000+ run
summary, it shows an honest "awaiting precomputation" state rather than
the old Poisson probabilities.

The cache key is `v7:3:<hash-of-V7-simulator.js>:<HOME>:<AWAY>:<hash-of-complete-matchup>`.
The last hash changes when saved owner lineups, starter or current player
ratings change. Old summary keys are never served for the new fingerprint.
The expanded prop schema uses version 3, so obsolete caches cannot silently
omit new skater/goalie markets.

## Thirty-minute automatic schedule

`.github/workflows/refresh-v7-odds.yml` runs every 30 minutes on the default
branch (GitHub Actions may delay schedules under load). It also runs on
merging code changes that alter the simulator or odds engine.

1. `/api/odds/upcoming` chooses the next 48 hours of *unplayed* official
   live games; up to 16 distinct ordered matchups are selected.
2. The workflow starts at most 8 V7 matchup jobs concurrently.
3. Each job loads the complete live roster and lineups, hashes the
   exact matchup and checks `/api/odds/v7-cache`. If 1,000+ valid
   simulations already exist for that fingerprint, it **skips work**.
4. On a cache miss, the job runs 1,000 independent deterministic V7 games
   and aggregates score, skater, and starting-goalie distributions.
5. The job requests a short-lived **GitHub Actions OIDC JWT**, verifies its
   signed workload identity against GitHub's public JWKS at the Vercel
   endpoint, and posts the compact summary to `/api/odds/v7-ingest`.
   Vercel writes the summary to its existing Redis service.

**No GitHub Actions Redis secret is required.** GitHub's signed OIDC claims
must match the exact repository, `main` branch, approved workflow, audience
and event. The cache write endpoint refuses unsigned requests, mismatched
keys and summaries containing fewer than 1,000 results.

Live data requests are retried for transient errors. Missing live roster
data or incomplete schedule results **fail closed**; the runner never
substitutes demo players or historical lineup assumptions.

## Limitations and performance

On a 2-vCPU sandbox, complete V7 gameplay takes approximately 1.1–1.6 seconds
per match. One cold 1,000-game matchup may take 18–27 minutes on one runner.
Multiple fixtures run on separate runners, so completed games are cached
before visitors need them. The 30-minute interval is a **check cadence**,
not a guarantee that a cold 1,000-game job finishes within 30 minutes.
A lineup change necessarily invalidates the previous fingerprint; the
new 1,000-game sample has to complete before updated numbers can appear.

The OIDC workflow publishes compact summaries only. The local/manual Redis
runner supports 25-game checkpoints; scheduled OIDC jobs rerun from zero
after interruption. Future improvements could add persistent raw-sample
checkpoints for OIDC jobs and better cost/queue management.

Price notation: large American fair moneyline, smaller modeled probability,
no bookmaker margin. Probabilities 0% and 100% do not have finite American
moneylines and display a dash. A 1,000-game sample has worst-case ~±3.1
percentage-point sampling uncertainty for a 50% binary event at 95%
confidence; rare event prop odds are intrinsically noisier.

Only **starting goalie** markets are displayed; backup goalie records remain
inside raw V7 samples so relief/shutout accounting remains correct. All
player prop odds are derived from official V7 box-score fields.

## Season futures

The old odds model is NOT a viable production fallback for accurate futures.
The V7 futures worker is experimental and requires far more distribution
sampling and durable precomputation. Public navigation presently focuses
on the complete-game odds and does not promote uncalibrated futures.

## Tests and manual operations

`npm run build` runs production prebuild regressions, including:
- `test:odds-v7-exact`: exact V7 worker parity, 12-game design preview,
  1,000-game gate and client read-only cache
- `test:odds-v7-markets`: 17 skater market thresholds, starting goalies only
- `test:odds-v7-cache`: Redis isolation and compact summary lookup
- `test:odds-v7-refresh`: verified schedule selection / bounded matrix
- `test:odds-v7-oidc`: RSA-signed workload JWT, correct workflow identity,
  rejection of unauthorized/malformed submissions

Manual smoke test (not publishable):
```bash
node scripts/precompute-v7-odds.mjs --away ARI --home ATL --target 2 --fixture --dry-run
```

The manual Redis workflow remains available if repository-side Redis secrets
are configured in the future, but the production automatic workflow does
not depend on them.
