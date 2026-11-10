export const MODEL_RUNS = 25000;
// Calibrated from the 512-game official V7 paired-seed validation:
 // 3.031 actual goals per team/game, including OT but excluding shootout credits.
 // A regulation Poisson mean of 2.95 plus one tiebreaking goal for tied games
 // produces approximately the same full-game total. Recheck with owner lineups.
export const LEAGUE_BASE_GOALS = 2.95;
export const ODDS_GAMEPLAY_VERSION = "V7";
// These are the full 40-team projected-lineup means as of the V7 release.
// Refit when the official rating distribution materially changes.
const V7_REFERENCE = Object.freeze({
  attack: 85.193, defending: 84.663, goalie: 86.402, pace: 85.140,
  goalieOverall: 85.725, eliteCreation: 1.188, eliteFinishing: -0.001,
});
const V7_SHOOTOUT_GIVEN_TIE = 0.553; // 55.26% in 512-game V7 validation


export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function number(value, fallback = 80) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rating(player, name, fallback = null) {
  if (!player) return fallback ?? 80;
  const value = Number(player.ratings?.[name]);
  if (Number.isFinite(value)) return value;
  if (Number.isFinite(Number(player.overall))) return Number(player.overall);
  return fallback ?? 80;
}

function weightedAverage(items, valueFn, weightFn = () => 1, fallback = 80) {
  let total = 0;
  let weight = 0;
  for (const item of items) {
    const w = Math.max(0, Number(weightFn(item)) || 0);
    if (!w) continue;
    total += valueFn(item) * w;
    weight += w;
  }
  return weight ? total / weight : fallback;
}

// Match V7's nonlinear talent signals, not just the old linear rating averages.
// Formulae mirror public/sim/simulator.js eliteCreationFactor and
// eliteFinishAdjustment, whose inputs are the live individual player ratings.
function eliteCreationFactor(player) {
  const score = rating(player, "Off. Awareness") * 0.29 +
    rating(player, "Passing") * 0.27 +
    rating(player, "Puck Control") * 0.20 +
    rating(player, "Deking") * 0.12 +
    number(player?.overall, 80) * 0.12;
  return clamp(Math.exp((score - 84) * 0.087), 0.52, 3.55);
}

function eliteFinishAdjustment(player) {
  const score = rating(player, "Wrist Shot Accuracy") * 0.32 +
    rating(player, "Slap Shot Accuracy") * 0.16 +
    rating(player, "Off. Awareness") * 0.24 +
    rating(player, "Hand Eye") * 0.16 +
    number(player?.overall, 80) * 0.12;
  return clamp(0.016 * (Math.exp((score - 86) * 0.074) - 1), -0.009, 0.026);
}

function v7GoalieEdge(overall) {
  const elite = clamp(0.0016 * Math.expm1((overall - 85) * 0.18) - 0.0003, -0.003, 0.0075);
  return clamp((overall - 87) * 0.00145 + elite, -0.024, 0.024);
}

function skaterOffense(player) {
  return (
    rating(player, "Off. Awareness") * 0.16 +
    rating(player, "Passing") * 0.13 +
    rating(player, "Puck Control") * 0.12 +
    rating(player, "Wrist Shot Accuracy") * 0.10 +
    rating(player, "Wrist Shot Power") * 0.06 +
    rating(player, "Slap Shot Accuracy") * 0.055 +
    rating(player, "Slap Shot Power") * 0.045 +
    rating(player, "Hand Eye") * 0.075 +
    rating(player, "Deking") * 0.075 +
    rating(player, "Poise") * 0.075 +
    rating(player, "Speed") * 0.045 +
    rating(player, "Acceleration") * 0.035
  ) / 0.975; // Correct original offense weights, which summed to 0.975.
}

function skaterDefense(player) {
  return (
    rating(player, "Def. Awareness") * 0.22 +
    rating(player, "Stick Checking") * 0.16 +
    rating(player, "Shot Blocking") * 0.13 +
    rating(player, "Body Checking") * 0.10 +
    rating(player, "Strength") * 0.08 +
    rating(player, "Balance") * 0.055 +
    rating(player, "Speed") * 0.055 +
    rating(player, "Acceleration") * 0.04 +
    rating(player, "Agility") * 0.04 +
    rating(player, "Endurance") * 0.045 +
    rating(player, "Poise") * 0.045 +
    rating(player, "Discipline") * 0.03
  );
}

function goalieStrength(player) {
  const saveRatings = ["Angles", "Breakaway", "Five Hole", "Glove High", "Glove Low", "Stick High", "Stick Low"];
  const saveCore = weightedAverage(saveRatings, (label) => rating(player, label), () => 1, number(player?.overall, 80));
  return (
    saveCore * 0.54 +
    rating(player, "Rebound Control") * 0.10 +
    rating(player, "Recover") * 0.08 +
    rating(player, "Vision") * 0.08 +
    rating(player, "Poise") * 0.065 +
    rating(player, "Agility") * 0.045 +
    rating(player, "Speed") * 0.025 +
    rating(player, "Poke Check") * 0.025 +
    rating(player, "Endurance") * 0.015 +
    rating(player, "Durability") * 0.01
  );
}

function meanPlayers(ids, byId, scorer, fallback = 80) {
  const players = (ids || []).map((id) => byId[String(id)]).filter(Boolean);
  return players.length ? weightedAverage(players, scorer) : fallback;
}

function lineWeight(line) {
  return ({ 1: 1, 2: 0.88, 3: 0.72, 4: 0.58 })[Number(line)] ?? 0.65;
}

function pairWeight(pair) {
  return ({ 1: 1, 2: 0.85, 3: 0.7 })[Number(pair)] ?? 0.7;
}

export function buildTeamModel(abbreviation, roster, lineup) {
  if (!lineup) throw new Error(`No active lineup is available for ${abbreviation}.`);
  const teamPlayers = roster.filter((player) => player.currentTeamAbbreviation === abbreviation || player.__teamAbbreviation === abbreviation);
  const byId = Object.fromEntries(teamPlayers.map((player) => [String(player.id), player]));

  const forwardEntries = lineup.forwards || [];
  const defenseEntries = lineup.defense || [];
  const goalieEntries = lineup.goalies || [];
  const forwards = forwardEntries.map((entry) => ({ entry, player: byId[String(entry.playerId)] })).filter((row) => row.player);
  const defense = defenseEntries.map((entry) => ({ entry, player: byId[String(entry.playerId)] })).filter((row) => row.player);
  const starterEntry = goalieEntries.find((entry) => Boolean(entry.starter)) || goalieEntries[0];
  const starter = starterEntry ? byId[String(starterEntry.playerId)] : null;

  if (forwards.length < 12 || defense.length < 6 || !starter) {
    throw new Error(`${abbreviation} does not have a complete 12F / 6D / starting-goalie model lineup.`);
  }

  const forwardOffense = weightedAverage(forwards, (row) => skaterOffense(row.player), (row) => lineWeight(row.entry.line));
  const forwardDefense = weightedAverage(forwards, (row) => skaterDefense(row.player), (row) => lineWeight(row.entry.line));
  const defenseOffense = weightedAverage(defense, (row) => skaterOffense(row.player), (row) => pairWeight(row.entry.pair));
  const defenseDefense = weightedAverage(defense, (row) => skaterDefense(row.player), (row) => pairWeight(row.entry.pair));

  const pp1 = meanPlayers(lineup.specialTeams?.pp1, byId, skaterOffense, forwardOffense);
  const pp2 = meanPlayers(lineup.specialTeams?.pp2, byId, skaterOffense, forwardOffense);
  const pk1 = meanPlayers(lineup.specialTeams?.pk1, byId, skaterDefense, forwardDefense);
  const pk2 = meanPlayers(lineup.specialTeams?.pk2, byId, skaterDefense, forwardDefense);
  const faceoffPlayers = forwards.map((row) => row.player);
  const faceoffs = weightedAverage(faceoffPlayers, (player) => rating(player, "Faceoffs"), (player) => {
    const pos = String(player.position || "").toUpperCase();
    return pos.includes("C") ? 1 : 0.25;
  });
  const discipline = weightedAverage([...forwards, ...defense], (row) => rating(row.player, "Discipline"));
  const pace = weightedAverage([...forwards, ...defense], (row) => (rating(row.player, "Speed") + rating(row.player, "Acceleration") + rating(row.player, "Agility")) / 3);

  const attack = forwardOffense * 0.64 + defenseOffense * 0.16 + ((pp1 * 0.62 + pp2 * 0.38)) * 0.16 + faceoffs * 0.04;
  const defending = forwardDefense * 0.24 + defenseDefense * 0.50 + ((pk1 * 0.62 + pk2 * 0.38)) * 0.18 + discipline * 0.08;
  const goalie = goalieStrength(starter);
  const overall = attack * 0.42 + defending * 0.30 + goalie * 0.28;
  // V7 gives elite creators more puck touches, and finishing ability alters
  // actual shot conversions. Track these independently of team rating averages.
  const eliteCreation = (
    weightedAverage(forwards, (row) => eliteCreationFactor(row.player), (row) => lineWeight(row.entry.line)) * 0.8 +
    weightedAverage(defense, (row) => eliteCreationFactor(row.player), (row) => pairWeight(row.entry.pair)) * 0.2
  );
  const eliteFinishing = (
    weightedAverage(forwards, (row) => eliteFinishAdjustment(row.player), (row) => lineWeight(row.entry.line)) * 0.8 +
    weightedAverage(defense, (row) => eliteFinishAdjustment(row.player), (row) => pairWeight(row.entry.pair)) * 0.2
  );

  return {
    abbreviation,
    attack,
    defending,
    goalie,
    goalieOverall: number(starter.overall, 80),
    eliteCreation,
    eliteFinishing,
    pace,
    overall,
    starter: starter.name,
    lineupRevision: number(lineup.revision, 0),
  };
}

export function expectedGoals(offense, opponent) {
  // Same V7 ratings, deployed lineups, elite creation/finishing curves and
  // nonlinear goalie overall edge, compressed into an inexpensive score model.
  // This is a V7-aligned *surrogate*, not 25,000 calls to the event engine.
  const attackTerm = (offense.attack - V7_REFERENCE.attack) * 0.022;
  const defenseTerm = (V7_REFERENCE.defending - opponent.defending) * 0.016;
  const goalieTerm = (V7_REFERENCE.goalie - opponent.goalie) * 0.018;
  const paceTerm = (((offense.pace + opponent.pace) / 2) - V7_REFERENCE.pace) * 0.004;
  const eliteCreation = Math.max(0.1, number(offense.eliteCreation, V7_REFERENCE.eliteCreation));
  const eliteCreationTerm = Math.log(eliteCreation / V7_REFERENCE.eliteCreation) * 0.25;
  // In V7, finishing changes per-shot goal probability; roughly 27.6 shots
  // per team translates one percentage point into ~0.276 goals.
  const eliteFinishingTerm = (number(offense.eliteFinishing, 0) - V7_REFERENCE.eliteFinishing) * 9.2;
  const goalieOverall = number(opponent.goalieOverall, V7_REFERENCE.goalieOverall);
  const eliteGoalieTerm = (v7GoalieEdge(V7_REFERENCE.goalieOverall) - v7GoalieEdge(goalieOverall)) * 9.2;
  return clamp(LEAGUE_BASE_GOALS * Math.exp(
    attackTerm + defenseTerm + goalieTerm + paceTerm +
    eliteCreationTerm + eliteFinishingTerm + eliteGoalieTerm
  ), 1.45, 5.5);
}

export function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    let x = (state += 0x6d2b79f5);
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function poisson(lambda, random) {
  const threshold = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= Math.max(random(), 1e-12);
  } while (product > threshold && count < 20);
  return Math.max(0, count - 1);
}

export function moneyline(probability) {
  const p = clamp(probability, 0.02, 0.98);
  if (Math.abs(p - 0.5) < 0.0025) return "EVEN";
  if (p >= 0.5) return String(-Math.round((100 * p) / (1 - p)));
  return `+${Math.round((100 * (1 - p)) / p)}`;
}

export function simulateModelGame(awayModel, homeModel, random) {
  const awayLambda = expectedGoals(awayModel, homeModel);
  const homeLambda = expectedGoals(homeModel, awayModel);
  let awayScore = poisson(awayLambda, random);
  let homeScore = poisson(homeLambda, random);
  let overtime = false;
  let shootout = false;
  if (awayScore === homeScore) {
    overtime = true;
    shootout = random() < V7_SHOOTOUT_GIVEN_TIE;
    const strengthGap = clamp((homeModel.overall - awayModel.overall) / 7.5, -4, 4);
    const homeOtChance = 1 / (1 + Math.exp(-strengthGap));
    if (random() < homeOtChance) homeScore += 1;
    else awayScore += 1;
  }
  return { awayScore, homeScore, overtime, shootout };
}

export function runMonteCarlo(game, awayModel, homeModel, runs = MODEL_RUNS) {
  const awayLambda = expectedGoals(awayModel, homeModel);
  const homeLambda = expectedGoals(homeModel, awayModel);
  const strengthGap = clamp((homeModel.overall - awayModel.overall) / 7.5, -4, 4);
  const homeOtChance = 1 / (1 + Math.exp(-strengthGap));
  const seed = hashString(`${game.id}:${awayModel.abbreviation}:${homeModel.abbreviation}:${awayModel.lineupRevision}:${homeModel.lineupRevision}:${awayLambda.toFixed(4)}:${homeLambda.toFixed(4)}`);
  const random = makeRandom(seed);

  let awayWins = 0;
  let homeWins = 0;
  let awayGoals = 0;
  let homeGoals = 0;
  let over65 = 0;
  let homeBy2 = 0;
  let awayBy2 = 0;
  let overtime = 0;
  let shootouts = 0;

  for (let index = 0; index < runs; index += 1) {
    let awayScore = poisson(awayLambda, random);
    let homeScore = poisson(homeLambda, random);
    if (awayScore === homeScore) {
      overtime += 1;
      const shootout = random() < V7_SHOOTOUT_GIVEN_TIE;
      if (shootout) shootouts += 1;
      if (random() < homeOtChance) homeScore += 1;
      else awayScore += 1;
    }
    if (homeScore > awayScore) homeWins += 1;
    else awayWins += 1;
    if (homeScore - awayScore >= 2) homeBy2 += 1;
    if (awayScore - homeScore >= 2) awayBy2 += 1;
    if (homeScore + awayScore > 6.5) over65 += 1;
    homeGoals += homeScore;
    awayGoals += awayScore;
  }

  const homeWin = homeWins / runs;
  const awayWin = awayWins / runs;
  return {
    awayWin,
    homeWin,
    awayMoneyline: moneyline(awayWin),
    homeMoneyline: moneyline(homeWin),
    awayProjected: awayGoals / runs,
    homeProjected: homeGoals / runs,
    awayLambda,
    homeLambda,
    over65: over65 / runs,
    under65: 1 - over65 / runs,
    homeCover15: homeBy2 / runs,
    awayCover15: awayBy2 / runs,
    otRate: overtime / runs,
    shootoutRate: shootouts / runs,
  };
}
