# AVHL 2026–27 Season Futures — Model and Rules

## Available markets

The season hub at /odds/season provides for all 40 Major League teams:
- Regular-season wins projection, win-total over/under choices (20.5–60.5).
- Expected final points, rank, and 10th/50th/90th-percentile wins.
- Division-title probability (four winners).
- Western/Eastern regular-season first-place probability.
- Presidents' Trophy (one winner).
- Playoff qualification (20 teams; ten per conference).
- Reach Round 1, Round 2, Conference Final, and League Final.
- Cup championship probability (one winner).
- League top-five and top-ten finish likelihoods.
- Relegation odds: league places **38–40** (bottom three).
- Per-team overview and distribution of projected regular-season wins.

## Source and method (explicitly different from exact V7 game odds)

This season-outlook module is a **provisional standings-based statistical
forecast**, not thousands of complete V7 engine games. The current season's
official completed games set team quality and provide an empirical distribution
of score margins and overtime. Remaining games use a smoothed, pairwise
win-probability model estimated from each team's record and goal differential,
with empirical home-ice adjustment. We then draw 10,000 complete
remaining-season scenarios and apply the exact 2026–27 AVHL league seeding,
bracket, and relegation rules.

The model is **not** a guarantee of accuracy or an official sportsbook market.
Its 10,000 runs reduce random sampling noise, but do not eliminate uncertainty
in projecting team quality. The model does not include future injuries or new
roster transactions until their effects appear in actual results. Probability
calibration against out-of-sample AVHL seasons and comparison against V7 exact
game samples should precede any claim of betting-grade reliability.

**Game and player prop odds remain completely separate** and still require at
least 1,000 exact full V7 games for the current lineup and simulator build.
Neither the pre-existing Poisson model nor this statistical futures model can
silently provide game odds.

## League format implemented

40 clubs, four divisions with ten clubs each, 20 per conference. Every team
has 82 regular-season games; total scheduled matches 1,640.
Ranked by the published official tiebreakers:
PTS → PTS% → RW → W → GF/G → GA/G (lower) → GD → team name.

Playoff entry:
- 1–3 in each division automatically qualify (six per conference).
- Four additional wild-card teams in each conference.
- Ten playoff teams in each conference; seeds 1–2 division winners, 3–4
  second places, 5–6 third places, 7–10 wild cards.
- Seeds 7–10 play best-of-five qualifiers, with seeds 1–6 receiving byes.
- Best-of-seven Round 1, Round 2, Conference Final, and League Final.
- Each season scenario has exactly 20 playoff qualifiers, 16 Round 1 teams,
  eight Round 2 teams, four Conference Final teams, two League Final
  teams, and one Cup champion.

Relegation: overall league places 38, 39, 40 in **the complete 40-team
league standings**. Three relegated teams per scenario.

The official schedule, completed results, season length and conference/division
structure are validated before generating any probabilities. If the live
schedule or complete live results are unavailable, the API returns an error
and the UI withholds probabilities; it does not use a bundled fallback.

## Performance and freshness

On an independent two-vCPU test environment, 10,000 full season scenarios
complete in roughly 1.5 seconds of local JavaScript execution. The
server-side computation is cached with a 30-minute revalidation window.
The /odds/season page fetches one compact summary and allows immediate
switching between all markets without restarting simulations.

The existing /odds/divisions, /odds/presidents-trophy and /odds/cup routes
redirect to the new season hub rather than using the older expensive,
insufficiently sampled exact-pair futures worker. /odds/wins,
/odds/playoffs, and /odds/relegation are convenient direct links.

## Invariants tested

Every scenario has:
- Four division champions and two conference regular-season leaders.
- One Presidents' Trophy winner and one Cup champion.
- Twenty playoff qualifiers, sixteen Round 1, eight Round 2, four conference
  finalists, and two Cup finalists.
- Exactly three relegated teams.
- 82-game records, with original official results unchanged.
