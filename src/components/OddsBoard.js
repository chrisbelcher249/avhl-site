"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const MODEL_RUNS = 25000;
const LEAGUE_BASE_GOALS = 3.05;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function number(value, fallback = 80) {
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
  );
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

function buildTeamModel(abbreviation, roster, lineup) {
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

  return {
    abbreviation,
    attack,
    defending,
    goalie,
    pace,
    overall,
    starter: starter.name,
    lineupRevision: number(lineup.revision, 0),
  };
}

function expectedGoals(offense, opponent) {
  // No generic home-ice bump: the event simulator currently does not award one either.
  const attackTerm = (offense.attack - 82) * 0.014;
  const defenseTerm = (82 - opponent.defending) * 0.011;
  const goalieTerm = (82 - opponent.goalie) * 0.017;
  const paceTerm = (((offense.pace + opponent.pace) / 2) - 82) * 0.004;
  return clamp(LEAGUE_BASE_GOALS * Math.exp(attackTerm + defenseTerm + goalieTerm + paceTerm), 1.45, 4.95);
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    let x = (state += 0x6d2b79f5);
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(lambda, random) {
  const threshold = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= Math.max(random(), 1e-12);
  } while (product > threshold && count < 20);
  return Math.max(0, count - 1);
}

function moneyline(probability) {
  const p = clamp(probability, 0.02, 0.98);
  if (Math.abs(p - 0.5) < 0.0025) return "EVEN";
  if (p >= 0.5) return String(-Math.round((100 * p) / (1 - p)));
  return `+${Math.round((100 * (1 - p)) / p)}`;
}


function runMonteCarlo(game, awayModel, homeModel) {
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

  for (let index = 0; index < MODEL_RUNS; index += 1) {
    let awayScore = poisson(awayLambda, random);
    let homeScore = poisson(homeLambda, random);
    if (awayScore === homeScore) {
      overtime += 1;
      const shootout = random() < 0.34;
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

  const homeWin = homeWins / MODEL_RUNS;
  const awayWin = awayWins / MODEL_RUNS;
  return {
    awayWin,
    homeWin,
    awayMoneyline: moneyline(awayWin),
    homeMoneyline: moneyline(homeWin),
    awayProjected: awayGoals / MODEL_RUNS,
    homeProjected: homeGoals / MODEL_RUNS,
    awayLambda,
    homeLambda,
    over65: over65 / MODEL_RUNS,
    under65: 1 - over65 / MODEL_RUNS,
    homeCover15: homeBy2 / MODEL_RUNS,
    awayCover15: awayBy2 / MODEL_RUNS,
    otRate: overtime / MODEL_RUNS,
    shootoutRate: shootouts / MODEL_RUNS,
  };
}

function formatDate(date) {
  const [year, month, day] = String(date).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function TeamIdentity({ team, compact = false }) {
  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
      <span className={`${compact ? "h-8 w-8" : "h-11 w-11"} relative shrink-0 overflow-hidden rounded-xl bg-white p-1 shadow-sm`}>
        <Image src={team.logo} alt="" fill sizes={compact ? "32px" : "44px"} className="object-contain p-1" />
      </span>
      <span className="min-w-0">
        <span className={`${compact ? "text-sm" : "text-base"} block truncate font-black text-[#000B36]`}>{team.name}</span>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{team.abbreviation}</span>
      </span>
    </div>
  );
}

function ProbabilityBar({ away, home, awayLabel, homeLabel }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <span>{awayLabel} {(away * 100).toFixed(1)}%</span>
        <span>{homeLabel} {(home * 100).toFixed(1)}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="bg-[#A90117]" style={{ width: `${away * 100}%` }} />
        <div className="bg-[#18BDFC]" style={{ width: `${home * 100}%` }} />
      </div>
    </div>
  );
}

export default function OddsBoard({ games, dates, teamDirectory, initialDate }) {
  const [selectedDate, setSelectedDate] = useState(initialDate || dates[0] || "");
  const [rosterState, setRosterState] = useState({ status: "loading", players: [], lineups: {}, sources: {}, error: "" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/sim-rosters?t=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !Array.isArray(payload.players)) throw new Error(payload?.error || "Live lineups could not be loaded.");
        if (cancelled) return;
        const byTeamName = Object.fromEntries(Object.values(teamDirectory).map((team) => [team.name, team.abbreviation]));
        const players = payload.players.map((player) => ({ ...player, __teamAbbreviation: byTeamName[player.currentTeam] || "" }));
        setRosterState({ status: "ready", players, lineups: payload.lineups || {}, sources: payload.lineupSources || {}, error: "" });
      } catch (error) {
        if (!cancelled) setRosterState({ status: "error", players: [], lineups: {}, sources: {}, error: error instanceof Error ? error.message : String(error) });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [teamDirectory]);

  const slate = useMemo(() => games.filter((game) => game.date === selectedDate), [games, selectedDate]);

  const modeledGames = useMemo(() => {
    if (rosterState.status !== "ready") return [];
    return slate.map((game) => {
      const awayTeam = teamDirectory[game.away];
      const homeTeam = teamDirectory[game.home];
      try {
        const awayModel = buildTeamModel(awayTeam.abbreviation, rosterState.players, rosterState.lineups[awayTeam.abbreviation]);
        const homeModel = buildTeamModel(homeTeam.abbreviation, rosterState.players, rosterState.lineups[homeTeam.abbreviation]);
        return { ...game, awayTeam, homeTeam, awayModel, homeModel, odds: runMonteCarlo(game, awayModel, homeModel), error: null };
      } catch (error) {
        return { ...game, awayTeam, homeTeam, odds: null, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }, [rosterState, slate, teamDirectory]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">AVHL Monte Carlo</p>
            <h2 className="mt-1 text-2xl font-black text-[#000B36]">Game Odds</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {MODEL_RUNS.toLocaleString()} score simulations per matchup using the current dressed lineup, line deployment, special-teams units, starting goalie, and live player ratings. Lines are model probabilities with no house edge.
            </p>
          </div>
          <label className="min-w-[240px] text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Slate
            <select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-[#000B36] outline-none focus:border-[#18BDFC]">
              {dates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
            </select>
          </label>
        </div>
      </section>

      {rosterState.status === "loading" ? (
        <div className="rounded-3xl border border-[#000B36]/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#18BDFC]" />
          <p className="mt-4 font-black text-[#000B36]">Loading live rosters and lineups…</p>
          <p className="mt-1 text-sm text-slate-500">The odds board uses the same lineup source of truth as the game simulator.</p>
        </div>
      ) : rosterState.status === "error" ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="font-black">Odds temporarily unavailable</p>
          <p className="mt-1 text-sm">{rosterState.error}</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {modeledGames.map((game) => (
            <article key={game.id} className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Game {game.id}</span>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#A90117]">Model Odds</span>
              </div>
              {game.error ? (
                <div className="p-5 text-sm font-bold text-red-700">{game.error}</div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div><TeamIdentity team={game.awayTeam} /></div>
                    <div className="text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">at</div>
                    <div className="flex justify-end"><TeamIdentity team={game.homeTeam} /></div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                      <div className="text-2xl font-black text-[#000B36]">{(game.odds.awayWin * 100).toFixed(1)}%</div>
                      <div className="mt-1 text-sm font-black text-[#A90117]">{game.odds.awayMoneyline}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
                      <div className="text-2xl font-black text-[#000B36]">{(game.odds.homeWin * 100).toFixed(1)}%</div>
                      <div className="mt-1 text-sm font-black text-[#18A7D9]">{game.odds.homeMoneyline}</div>
                    </div>
                  </div>

                  <div className="mt-4"><ProbabilityBar away={game.odds.awayWin} home={game.odds.homeWin} awayLabel={game.awayTeam.abbreviation} homeLabel={game.homeTeam.abbreviation} /></div>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Projected</div>
                      <div className="mt-1 text-sm font-black text-[#000B36]">{game.awayTeam.abbreviation} {game.odds.awayProjected.toFixed(2)} · {game.homeTeam.abbreviation} {game.odds.homeProjected.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">O/U 6.5</div>
                      <div className="mt-1 text-sm font-black text-[#000B36]">O {(game.odds.over65 * 100).toFixed(0)}% · U {(game.odds.under65 * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Puck line</div>
                      <div className="mt-1 text-sm font-black text-[#000B36]">
                        {game.odds.homeWin >= game.odds.awayWin
                          ? `${game.homeTeam.abbreviation} -1.5 ${(game.odds.homeCover15 * 100).toFixed(0)}%`
                          : `${game.awayTeam.abbreviation} -1.5 ${(game.odds.awayCover15 * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#000B36] px-3 py-2 text-[11px] font-bold text-white/65">
                    <span>Starter: {game.awayModel.starter} vs {game.homeModel.starter}</span>
                    <span>{rosterState.sources[game.awayTeam.abbreviation] || "projected"} / {rosterState.sources[game.homeTeam.abbreviation] || "projected"}</span>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      <section className="grid gap-4 rounded-3xl bg-[#000B36] p-6 text-white md:grid-cols-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Lineup aware</p>
          <p className="mt-2 text-sm leading-6 text-white/65">Owner-saved lineups are priced when valid. Projected or auto-optimized lineups are used when that is the simulator's active lineup.</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Rating aware</p>
          <p className="mt-2 text-sm leading-6 text-white/65">Shot creation, playmaking, skating, defending, faceoffs, discipline, special teams, and the starting goalie's full save profile all influence expected scoring.</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Score only</p>
          <p className="mt-2 text-sm leading-6 text-white/65">The Monte Carlo stores only final score outcomes. It does not create official games, player stats, injuries, or Google Sheet rows.</p>
        </div>
      </section>
    </div>
  );
}
