"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { MODEL_RUNS, buildTeamModel, runMonteCarlo } from "@/lib/oddsModel";

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
          <p className="mt-2 text-sm leading-6 text-white/65">Owner-saved lineups are priced when valid. If a trade or injury creates an open slot, the same temporary repair used by the simulator is priced without overwriting the owner lineup.</p>
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
