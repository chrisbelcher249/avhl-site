# AVHL Odds — exact V7, minimum 1,000 games (draft)

## Design principle

The V7 gameplay engine in `public/sim/simulator.js` is the sole generator of
score, skater, and goaltender outcomes. Do **not** replace events with an
unvalidated independent Poisson scoring formula. Running fewer games can
be faster, but does not meet the 1,000-game publishing floor.

## Game odds publishing gate

- **Minimum: 1,000 complete, independent V7 simulations for each exact game
  matchup and owner-lineup configuration**. All numerical winner, total, spread,
  and player-prop odds remain hidden until then.
- Wilson intervals communicate remaining sample error; 1,000 trials gives a
  maximum ~3.1 percentage point 95% binomial sampling half-width.
- The browser worker processes and saves samples in batches, with progress
  messages containing only newly completed games (no O(N²) copying).
- Cache fingerprint: `v7:2:<hash-of-simulator.js>:<HOME>:<AWAY>:<hash-of-entire-V7-matchup>`.
  A lineup, player rating, game-engine, starting-goalie, or valid-roster change
  invalidates the corresponding matchup's cached samples automatically.
- A read-only API endpoint `/api/odds/v7-cache?key=...` returns a **shared**,
  published 1,000+ sample summary from existing Upstash Redis. The compact
  summary avoids transferring entire game histories to visitors. Invalid and
  foreign keys are rejected; no official game data is modified.
- **The public odds page never runs full games on a visitor device.** When
  precomputed odds are missing, show a pending state and poll the shared cache.
  The heavy simulations run on scheduled servers, not in a browser tab.

## Practical precomputation

The repo contains `scripts/precompute-v7-odds.mjs`. It loads current public
`/api/sim-rosters` data, fails closed unless the roster is `source=live`,
then runs the *identical* V7 Javascript engine plus the *same* sample
serialization used in the browser. It writes resumable 25-game checkpoints
into the existing Redis REST backend and a small read-only aggregate summary
for fast viewing. Existing computed samples are reused on subsequent jobs,
rather than recomputed after a process restart.

Example operation in an authorized environment:

```bash
node scripts/precompute-v7-odds.mjs --away ARI --home ATL --target 1000
```

For local smoke tests (no Redis, never eligible for publishing):

```bash
node scripts/precompute-v7-odds.mjs --away ARI --home ATL --target 2 --fixture --dry-run
```

Two GitHub Actions workflows are included. The scheduled
`.github/workflows/refresh-v7-odds.yml` checks the verified live upcoming
schedule every **30 minutes**. It prioritizes up to 16 upcoming matchups,
runs up to 8 jobs in parallel, and calls the exact V7 batch runner only for
missing or outdated owner-lineup/engine fingerprints. Existing 1,000-game
matchups are **not rerun** at every check. GitHub Actions schedule triggers
can be delayed, and cold jobs can run longer than one interval. The schedule
only becomes active on the repository's default branch after the draft PR
is approved and merged.

A **manual-only** GitHub Actions workflow is also included. It will not
automatically consume any compute until an operator invokes it and configures
the repository Secrets `ODDS_UPSTASH_REDIS_REST_URL` and
`ODDS_UPSTASH_REDIS_REST_TOKEN`, pointing to the site's existing shared cache.
Configure secrets in GitHub's secret settings; never put token values in code,
workflow inputs, or issue comments.

**Performance reality:** profiling on a 2-vCPU Node sandbox measured
approximately 1.1–1.6 seconds per full V7 game, with most CPU spent in
spatial hockey mechanics. At that rate, the cold calculation for one 1,000-game
matchup can take around 18–27 minutes of serial CPU time. Shared, persistent
precomputation removes this cost from repeat visitors; parallel job execution
reduces wall time across several fixtures but not total CPU cost.

The auto-refresh workflow and shared compact cache are implemented **in the
PR only**. Before a real release, configure the repository cache secrets,
verify scheduled GitHub Actions permissions and compute-budget limits, and
run an end-to-end live browser test. Newly modified lineups automatically
invalidate the old cache key; they require a fresh 1,000-game sample before
new odds may display. Never quietly display stale or 999-game odds.

## Futures

The existing 40 × 39 ordered-matchup V7 futures worker needs 6,240 games
just to reach **four samples per orientation**. At ~1.1–1.6 seconds per game,
that is at least ~1.9–2.8 hours serial CPU, and four outcomes per pairing
cannot yield trustworthy championship odds. Because this is costly, preview
futures calculation is now **opt-in**, not automatic.

Before publishing futures, create an efficient central library of empirically
sampled V7 score distributions, with many more than four games per pairing
or a separately labeled and back-tested surrogate. Bootstrap complete
remaining regular seasons and playoff series from that cached library. The
finished/current official results remain fixed. Do not confuse 3,000
bootstrapped futures seasons with 3,000 *new* V7 game simulations.
A futures view should never silently fall back to the old score model.

## Validation and release gates

`npm run build` runs the existing AVHL regression tests plus:
`test:odds-v7-exact`, `test:odds-v7-futures`, and
`test:odds-v7-cache`.

Before merging: perform a real browser/worker test in Vercel preview,
confirm the shared key produced by server-side and browser V7 matches,
verify 1,000-sample progress and cache resume, verify no stale lineup odds,
and evaluate meaningful confidence intervals/market calibration on a
larger held-out V7 sample. Do not deploy incomplete futures probabilities
to production.
