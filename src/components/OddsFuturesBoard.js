"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { buildTeamModel, moneyline } from "@/lib/oddsModel";
import { FUTURE_RUNS, simulateFutures } from "@/lib/futuresModel";

function percentage(count) {
  return count / FUTURE_RUNS;
}

function OddsRow({ team, probability, rank }) {
  return (
    <div className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 border-b border-[#000B36]/7 px-3 py-3 last:border-0 md:grid-cols-[40px_1fr_110px_100px]">
      <span className="text-center text-xs font-black tabular-nums text-[#000B36]/35">{rank}</span>
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative h-9 w-9 shrink-0 rounded-xl bg-white p-1 ring-1 ring-[#000B36]/8">
          <Image src={team.logo} alt="" fill sizes="36px" className="object-contain p-1" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#000B36]">{team.name}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/35">{team.abbreviation}</p>
        </div>
      </div>
      <span className="text-right text-sm font-black tabular-nums text-[#000B36]">{(probability * 100).toFixed(probability < 0.01 ? 2 : 1)}%</span>
      <span className="hidden text-right text-sm font-black tabular-nums text-[#A90117] md:block">{moneyline(probability)}</span>
    </div>
  );
}

function DivisionView({ teams, counts }) {
  const divisions = [...new Set(teams.map((team) => team.division))];
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {divisions.map((division) => {
        const rows = teams.map((team, index) => ({ team, probability: percentage(counts[index]) })).filter(({ team }) => team.division === division).sort((a, b) => b.probability - a.probability);
        return (
          <section key={division} className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
            <div className="border-b border-[#000B36]/8 bg-[#000B36] px-5 py-4 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Division futures</p>
              <h2 className="mt-1 text-2xl font-black">{division}</h2>
            </div>
            <div>{rows.map((row, index) => <OddsRow key={row.team.slug} {...row} rank={index + 1} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

function LeagueFuturesView({ teams, counts, title, eyebrow }) {
  const rows = teams.map((team, index) => ({ team, probability: percentage(counts[index]) })).sort((a, b) => b.probability - a.probability);
  return (
    <section className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="border-b border-[#000B36]/8 bg-[#000B36] px-5 py-4 text-white md:px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black">{title}</h2>
      </div>
      <div>{rows.map((row, index) => <OddsRow key={row.team.slug} {...row} rank={index + 1} />)}</div>
    </section>
  );
}

export default function OddsFuturesBoard({ mode, schedule, teams }) {
  const [state, setState] = useState({ status: "loading", players: [], lineups: {}, error: "" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/sim-rosters?t=${Date.now()}`, { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.ok || !Array.isArray(payload.players)) throw new Error(payload?.error || "Live lineups could not be loaded.");
        if (cancelled) return;
        const byTeamName = Object.fromEntries(teams.map((team) => [team.name, team.abbreviation]));
        const players = payload.players.map((player) => ({ ...player, __teamAbbreviation: byTeamName[player.currentTeam] || "" }));
        setState({ status: "ready", players, lineups: payload.lineups || {}, error: "" });
      } catch (error) {
        if (!cancelled) setState({ status: "error", players: [], lineups: {}, error: error instanceof Error ? error.message : String(error) });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [teams]);

  const result = useMemo(() => {
    if (state.status !== "ready") return null;
    try {
      const models = teams.map((team) => buildTeamModel(team.abbreviation, state.players, state.lineups[team.abbreviation]));
      return { ...simulateFutures(schedule, teams, models), error: "" };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [schedule, state, teams]);

  if (state.status === "loading") {
    return (
      <div className="rounded-3xl border border-[#000B36]/10 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-[#18BDFC]" />
        <p className="mt-4 font-black text-[#000B36]">Running season futures…</p>
        <p className="mt-1 text-sm text-slate-500">Loading the same live rosters and active lineups used by the AVHL simulator.</p>
      </div>
    );
  }
  if (state.status === "error" || result?.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="font-black">Futures temporarily unavailable</p>
        <p className="mt-1 text-sm">{state.error || result?.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Full-season Monte Carlo</p>
            <h2 className="mt-1 text-2xl font-black text-[#000B36]">{FUTURE_RUNS.toLocaleString()} simulated seasons</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Completed results are locked. Every remaining game is simulated from current live rosters and active lineups, then the official AVHL tiebreakers and playoff seeding rules are applied.
            </p>
          </div>
          <div className="rounded-2xl bg-[#F3F7FB] px-4 py-3 text-right">
            <p className="text-2xl font-black tabular-nums text-[#000B36]">{result.remainingGames}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#000B36]/35">Games left to model</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
          Futures assumption: EA-played games and AVHL simulator games are treated as equivalent draws from the same team-strength distribution. These are fair model odds, not sportsbook lines.
        </p>
      </section>

      {mode === "divisions" ? <DivisionView teams={teams} counts={result.divisionWins} /> : null}
      {mode === "presidents" ? <LeagueFuturesView teams={teams} counts={result.presidents} eyebrow="Best regular-season record" title="Presidents' Trophy Odds" /> : null}
      {mode === "cup" ? <LeagueFuturesView teams={teams} counts={result.cups} eyebrow="League championship" title="Cup Odds" /> : null}
    </div>
  );
}
