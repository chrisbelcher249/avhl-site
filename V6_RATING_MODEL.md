# AVHL Simulator V6.1 — Rating and RNG Model

V6.1 retains the V6.0 rating engine, which removes the old synthetic line-tier ratings and feeds the simulator the same live player database used by the AVHL Players/Team pages. When the live Google Sheets CSV is available, `/api/sim-rosters` reads it through `src/lib/players.js`; `public/sim/data.js` then builds the game rosters from those live rows. The bundled `data/players.js` fallback was regenerated from the September 8, 2026 CSV files so an outage does not silently restore the older August rosters.

## Core RNG philosophy

The seed does not pick a final score. The simulator advances through hockey events and uses seeded random draws at each decision point. Ratings change the probability distribution for those decisions; context (rink position, fatigue, pressure, manpower, traffic, player movement, previous events) changes it again. The final game is the accumulation of those event outcomes.

A typical V6 decision follows this pattern:

1. Build an event-specific skill composite from the players involved.
2. Apply spatial/context/fatigue modifiers.
3. Convert the result to a probability and clamp it to a sensible floor/ceiling.
4. Draw from the seeded RNG.
5. Update possession, positions, stats, fatigue, penalties, injuries, and the next event state.

`Overall Rating` is not a universal hidden outcome multiplier. It is used mainly for automatic roster/line ordering and as a defensive fallback only if a specific rating is missing. With a complete current CSV row, the specific attributes drive the game.

The normal hockey RNG and the injury RNG use separate deterministic seeded streams. That keeps injuries reproducible without consuming the normal event RNG until an injury actually changes personnel.

## Position familiarity

If the automatic lineup uses a skater at a position within the correct general group that is not one of the player's listed positions, V6 applies the AVHL 3% familiarity penalty only to:

- Offensive Awareness
- Defensive Awareness
- Passing
- Puck Control

Forwards can still play LW/C/RW and defensemen LD/RD. No blanket 3% penalty is applied to skating, shooting, physical, or other ratings.

## Skater ratings — where each one matters

| Rating | Main V6 uses |
| --- | --- |
| Deking | Controlled entries, breakaway/deke shot selection and finishing, puck-carry skill. |
| Hand Eye | One-timers, tips, jams/rebounds, interception/loose-puck contexts, shooting skill on deflections. |
| Passing | Pass completion, breakout quality, clear attempts, goalie-like outlet contexts for skaters, PP puck movement. |
| Puck Control | Entries, pass reception/retention, puck protection after contact, breakouts, dekes. |
| Discipline | Penalty likelihood and whether aggressive contact becomes dangerous/illegal. |
| Off. Awareness | Passing targets, zone entries, screens, shot targeting, offensive positioning and loose-puck collection. |
| Poise | Passing under pressure, faceoffs, shooting under pressure, breakouts, blocking, fights/discipline contexts. |
| Slap Shot Accuracy | Accuracy of slap-shot attempts. |
| Slap Shot Power | Slap/one-timer power, shot danger, blocks/injury impact, clearing power. |
| Wrist Shot Accuracy | Accuracy/selection of wrist and snap shots; part of deke finishing. |
| Wrist Shot Power | Wrist/snap/backhand power, shot danger, clearing power for forwards. |
| Def. Awareness | Defensive selection/positioning, entries against, interceptions, blocks, recoveries. |
| Faceoffs | Primary faceoff rating. |
| Shot Blocking | Blocker selection/success and resistance to shot-block injury impact. |
| Stick Checking | Entry defense, interceptions/takeaways, forecheck/defensive pressure. |
| Acceleration | Spatial movement acceleration, entries, loose-puck races and breakouts. |
| Agility | Turning/movement, entries, loose-puck races, contact resistance and breakouts. |
| Balance | Faceoffs, contact resistance, loose-puck races, screens, blocks and fights. |
| Endurance | Fatigue accumulation and therefore downstream skating/skill effectiveness and fatigue-injury exposure. |
| Speed | Maximum skating speed, entries, recovery races, forechecking and hit approach. |
| Aggressiveness | Hit/fight involvement, forechecking, physical-event selection and penalty risk. |
| Body Checking | Hit selection/impact, turnover force on contact and entry defense. |
| Durability | Primary injury-resistance rating and a contributor to injury severity. |
| Fighting Skill | Fight participant selection and fight outcome/injury context. |
| Strength | Faceoffs, checks, puck protection, screens, tips/jams, clears and fights. |

## Goalie ratings — where each one matters

| Rating | Main V6 uses |
| --- | --- |
| Angles | Base save skill and crease depth/positioning. |
| Breakaway | Primary breakaway/deke defense. |
| Five Hole | Save ability when the actual shot target is five-hole. |
| Glove High | Save ability against glove-high target. |
| Glove Low | Save ability against glove-low target. |
| Stick High | Save ability against stick-high target. |
| Stick Low | Save ability against stick-low target. |
| Passing | Success of controlled goalie puck plays/outlets. |
| Poise | Saves, puck play under pressure and breakaway response. |
| Poke Check | Breakaway/deke defense. |
| Puck Playing Freq. | Willingness to leave a controlled save in play and make an outlet. |
| Rebound Control | Whether saves are covered/controlled versus dangerous rebounds. |
| Recover | Rebound-save quality and recovery after the first save. |
| Aggressiveness | Crease depth and a small breakaway-response component. |
| Agility | Goalie lateral movement/turning and save/breakaway response. |
| Durability | Goalie injury resistance/severity. |
| Endurance | Goalie fatigue accumulation. |
| Speed | Goalie movement/recovery speed and a small breakaway-response component. |
| Vision | Tracking through screens/traffic and target-reading interaction with shooter awareness. |

## Important event formulas

These are the primary V6 composites. They are not the whole probability by themselves; spatial pressure, fatigue, context and probability clamps are applied afterward.

### Faceoffs

Each center receives a contest score:

`68% Faceoffs + 12% Strength + 10% Balance + 10% Poise + Normal(0, 8)`

The higher seeded score wins. The margin determines whether the win is clean, tied-up, or a scramble.

### Controlled zone entry

Carrier composite:

`22% Speed + 14% Acceleration + 12% Agility + 22% Puck Control + 19% Deking + 11% Offensive Awareness`

Defender composite:

`14% Speed + 10% Acceleration + 10% Agility + 24% Stick Checking + 25% Defensive Awareness + 11% Body Checking + 6% Balance`

Base entry probability:

`0.58 + (carrier skill - defender skill) × 0.012 - carrier fatigue × 0.055 + defender fatigue × 0.035`

Clamped to `32%–84%`.

### Breakout

Carrier breakout composite:

`32% Passing + 24% Puck Control + 16% Poise + 12% Defensive Awareness + 8% Agility + 8% Acceleration`

Probability starts around 71%, moves by `1.1 percentage points per composite point above/below 82`, then is reduced by local forecheck pressure and fatigue. It is clamped to `40%–92%`.

### Passes

Primary passer composite:

`54% Passing + 20% Puck Control + 15% Poise + 11% Offensive Awareness`

Primary defender/interception composite:

`62% Defensive Awareness + 38% Stick Checking`

The final completion probability also uses lane geometry, pressure, pass distance/context, fatigue and receiver quality. Receiver selection favors Offensive Awareness, Puck Control, Speed and — especially for one-timers — Hand Eye.

### Screens

Screen skill:

`34% Strength + 24% Hand Eye + 24% Offensive Awareness + 18% Balance`

A small size/height component and the player's actual location relative to the goalie/shot lane also matter. Point shots create more screening opportunity than low-angle shots.

### Shot blocks

Blocker composite:

`48% Shot Blocking + 30% Defensive Awareness + 12% Balance + 10% Poise`

The shooter release side uses Offensive Awareness, shot power and Poise. Actual shot-lane geometry controls which defender can block and how much opportunity exists.

### Shooting

Normal shooter finishing composite:

`42% relevant Shot Accuracy + 17% relevant Shot Power + 20% Offensive Awareness + 16% Poise + 5% Hand Eye`

Special contexts override the normal blend:

- Deke/breakaway finish: `38% Deking + 27% Puck Control + 18% Poise + 10% Wrist Accuracy + 7% Hand Eye`
- Tip/jam finish: `38% Hand Eye + 18% Strength + 14% Puck Control + 18% Offensive Awareness + 12% Poise`
- One-timers receive additional Hand Eye influence.

Shot technique itself is also weighted by ratings and context. For example, stronger slap shooters are more likely to use a slap shot from the point, while Deking makes a breakaway deke more likely.

### Shot targeting and goalie save model

The shooter selects among glove high/low, stick high/low and five-hole based on target openness. Shooter Offensive Awareness and Poise improve the quality of target selection; pressure reduces it. Goalie movement and Vision alter what appears open.

Base goalie composite on the shot:

`38% target-specific save rating + 20% Angles + Vision + 11% Poise + 8% Agility + Recover`

Vision is weighted more heavily when screened; Recover is weighted more heavily on rebounds.

For breakaways/dekes, a specialized defense composite is blended into the goalie score:

`52% Breakaway + 23% Poke Check + 10% Agility + 7% Speed + 5% Poise + 3% Aggressiveness`

The final goal probability also incorporates shot region/quality, target openness, screens, power-play state, shooter-vs-goalie fatigue and pressure.

### Save outcome / rebounds

After a save is made, Rebound Control, Recover, Poise, Vision, shot power and fatigue help determine whether the puck is covered, steered safely, or left as a dangerous rebound.

### Goalie puck play

Puck-play willingness is driven mainly by `Puck Playing Freq.`, then Poise and forecheck pressure. If the goalie elects to play it, completion uses Passing + Poise against pressure. The outlet target is chosen using the receiving skater's Defensive Awareness, Passing, Puck Control and Speed.

### Hits

Hit involvement/impact uses Body Checking, Strength, Aggressiveness, Speed/Acceleration, Balance, relative player weight, spatial distance and the target's puck-control/contact resistance. The turnover after a check is a matchup between the hitter's physical force and the victim's Balance/Puck Control/Strength/Agility, with fatigue included.

Discipline + Poise reduce the chance an aggressive contact event becomes illegal/dangerous; Aggressiveness/Body Checking/Strength push the physical side upward.

### Fights

Participant selection weight:

`42% Fighting Skill + 25% Aggressiveness + 23% Strength + 6% Balance + 4% Poise`

Fight resolution then uses Fighting Skill/Strength/Balance plus seeded randomness. Fights can also trigger an injury roll for either participant.

### Loose-puck races and spatial movement

Speed sets top skating speed; Acceleration controls how quickly the player reaches it; Agility affects turning; Balance and awareness contribute to recoveries; fatigue reduces movement capability. Positions are advanced through actual rink coordinates rather than inferred only from event labels.

## Injury model

Injuries are game events, not a postgame lottery. V6 currently allows injuries from:

- body checks, with higher risk on dangerous/penalized hits;
- blocked shots, with shot power and block context affecting impact;
- fights;
- long/high-fatigue shifts (rare non-contact injuries);
- close-range goalie collisions/jams/breakaways.

### Injury susceptibility

Durability is the primary player-level modifier:

`durability factor = 1 + (82 - Durability) × 0.035`

This is multiplied by:

`fatigue factor = 1 + fatigue × 0.55`

and a small age modifier above age 30:

`age factor = 1 + max(age - 30, 0) × 0.008`

The combined susceptibility is clamped to `0.48–2.15` before event impact is applied.

Examples before fatigue/age/context:

- Durability 90 → about 0.72× baseline injury risk.
- Durability 82 → 1.00× baseline.
- Durability 70 → about 1.42× baseline.

Each injury opportunity is then:

`event base probability × susceptibility × event impact`

and is drawn from the separate deterministic injury RNG.

### Current base injury opportunities

- ordinary hit: about 0.40% before player/context modifiers;
- dangerous/penalized hit: about 0.52% with elevated impact;
- blocked shot: about 0.28% before shot/blocker modifiers;
- fight: about 1.4% per fighter before player/context modifiers;
- fatigue/non-contact: very small per qualifying long-shift check;
- goalie collision: roughly 0.035%–0.18% depending on chance type, with crease jams/close plays highest.

Because these probabilities are evaluated only when the corresponding event exists, a physical, shot-block-heavy game naturally creates more injury exposure than a low-contact game.

### Injury severity / games missed

Once an injury occurs, a second seeded roll is shifted by Durability, event impact and a small age component. Approximate duration bands are:

| Severity | Future games missed |
| --- | ---: |
| Day-to-day | 1–2 |
| Minor | 3–5 |
| Moderate | 6–12 |
| Major | 13–24 |
| Severe | 25–45 |

Body-area labels depend on cause (for example blocked shots are more likely to create hand/wrist or foot/ankle injuries; hits have a broader upper/lower/shoulder/head/back mix).

### What happens in the current game

- Injured skaters become unavailable immediately and line/unit selection is rebuilt around the remaining healthy players.
- If the puck carrier is injured, possession becomes loose.
- An injured starting goalie is replaced immediately by the healthy backup and a `goalie-change` event is logged.
- A team cannot lose the replacement goalie to another simulated goalie injury when no healthy goalie replacement exists.

The official packet schema is now `avhl-official-game-v2` and includes injury records with player/AVHL ID, team, cause, body area, severity, games missed, Durability, fatigue, game clock and impact metadata.

V6 does **not** pretend to write those future-game absences back to Google Sheets. The current site has a read-only live CSV path, not an authenticated Sheets mutation endpoint. The official packet is the clean handoff point for a later season injury ledger / IR system.

## Calibration / interpretation

The test harness (`scripts/test-simulator-v6.mjs`) does two kinds of validation:

- exact-rating identity: a known player's internal simulator attributes must equal the current CSV values;
- deterministic repeatability: the same matchup + seed must reproduce the same score, event sequence and injuries.

It also sums every actual injury opportunity probability rather than judging calibration from only the small number of realized injuries in a short test run.

A 20-game V6 calibration sample after the injury/goalie fixes produced approximately:

- 5.1 goals per game;
- 52.3 shots per game;
- 84.7 shot attempts per game;
- 34.3 hits per game;
- 16.7 blocks per game;
- expected injury rate 0.209 per game, or about 8.6 injuries per team over an 82-game season.

That expected injury total is intentionally more trustworthy than the realized injury count in a 20-game sample. Injury outcomes are rare Bernoulli events, so short samples swing substantially.

## Data caveat found during V6 conversion

The September 8 skater file contains 1,694 skaters versus 1,695 in the older bundled source. AVHL ID `1650` (Landon DuPont, previously listed as UFA) is absent from the new file. V6 does not hard-code an expected total, so this is treated as source-data truth rather than silently resurrecting the old row.
