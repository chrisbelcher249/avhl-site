"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fairMoneyline } from "@/lib/v7OddsSamples";
import { FUTURE_RUNS, simulateV7Futures } from "@/lib/futuresModel";

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
      <span className="hidden text-right text-sm font-black tabular-nums text-[#A90117] md:block">{fairMoneyline(probability)}</span>
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
  const workerRef = useRef(null);
  const [state, setState] = useState({ status: "loading", complete: 0, total: teams.length * (teams.length - 1) * 4, pairs: 0, target: 4, error: "", result: null, seasons: 0 });
  const [requestedSamples, setRequestedSamples] = useState(4);
  const [paused, setPaused] = useState(false);
  const teamBySlug = useMemo(() => Object.fromEntries(teams.map(t => [t.slug, t.abbreviation])), [teams]);
  const remainingPairs = useMemo(() => [...new Set(schedule
    .filter(g => g.awayScore == null && g.homeScore == null)
    .map(g => `${teamBySlug[g.away]}:${teamBySlug[g.home]}`)
    .filter(x => !x.includes("undefined")))], [schedule, teamBySlug]);

  useEffect(() => {
    if (paused) return undefined;
    let cancelled = false;
    const worker = new Worker("/odds/v7-futures-worker.js");
    workerRef.current = worker;
    setState(current => ({ ...current, status: "loading", result: null, seasons: 0, error: "", target: requestedSamples }));
    worker.onmessage = async (event) => {
      const message = event.data || {};
      if (cancelled) return;
      if (message.type === "error") {
        setState(current => ({ ...current, status: "error", error: message.error || "Unable to simulate exact V7 futures." }));
        return;
      }
      if (message.type === "progress") {
        setState(current => ({ ...current, status: "running", complete: message.complete, total: message.total, pairs: message.pairs, target: message.target }));
        return;
      }
      if (message.type === "complete") {
        setState(current => ({ ...current, status: "projecting", complete: message.complete, total: message.total, pairs: message.pairs, target: message.target }));
        try {
          const totals = { divisionWins: teams.map(() => 0), presidents: teams.map(() => 0), cups: teams.map(() => 0) };
          const batch = 300;
          for (let n = 0; n < FUTURE_RUNS; n += batch) {
            if (cancelled) return;
            const count = Math.min(batch, FUTURE_RUNS - n);
            const segment = simulateV7Futures(schedule, teams, message.pools, count, `batch-${n}`);
            for (const key of ["divisionWins", "presidents", "cups"])
              for (let i = 0; i < teams.length; i++) totals[key][i] += segment[key][i];
            setState(current => ({ ...current, seasons: n + count }));
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          if (cancelled) return;
          setState(current => ({
            ...current, status: "ready",
            result: { ...totals, remainingGames: schedule.filter(g => g.awayScore == null && g.homeScore == null).length },
            seasons: FUTURE_RUNS
          }));
        } catch (error) {
          if (!cancelled) setState(current => ({ ...current, status: "error", error: error instanceof Error ? error.message : String(error) }));
        }
      }
    };
    worker.onerror = () => {
      if (!cancelled) setState(current => ({ ...current, status: "error", error: "V7 future-sampling worker failed." }));
    };
    worker.postMessage({
      type: "start", teams: teams.map(t => t.abbreviation),
      remainingPairs, samplesPerMatchup: requestedSamples
    });
    return () => { cancelled = true; worker.postMessage({ type: "cancel" }); worker.terminate(); if (workerRef.current === worker) workerRef.current = null; };
  }, [teams, schedule, remainingPairs, requestedSamples, paused]);

  const progress = state.total ? Math.min(100, 100 * state.complete / state.total) : 0;
  const result = state.result;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">AVHL V7 · Exact gameplay sample pools</p>
        <h2 className="mt-1 text-2xl font-black text-[#000B36]">Season Futures</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The old Poisson scoring model is not used here. We first simulate actual V7 games for every ordered team matchup
          using current owner lineups, then bootstrap {FUTURE_RUNS.toLocaleString()} season and playoff scenarios from those observed results.
          Completed games remain fixed. This initial full-league calculation is computationally expensive; saved samples resume when you return.
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
          Initial futures are provisional: only {state.target} actual V7 games per matchup. Repeated draws from a small sample do not
          establish precise long-shot or championship probabilities. The estimates should be refined before public release.
        </p>
      </section>
      <section className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Calculation progress</p>
            <p className="mt-1 text-lg font-black tabular-nums text-[#000B36]">
              {state.status === "projecting" || state.status === "ready" ? `${state.seasons.toLocaleString()} / ${FUTURE_RUNS.toLocaleString()} future seasons` :
                `${state.complete.toLocaleString()} / ${state.total.toLocaleString()} exact V7 games`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {state.status === "ready" ? "Empirical V7 futures sample is ready." :
                state.status === "projecting" ? "Applying official standings, seeding and playoff rules…" :
                paused ? "Calculation paused. Previously simulated games are saved." :
                "The first calculation may take considerable time. Keep the tab open, or return later to resume."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.status === "ready" && requestedSamples < 32 ? (
              <button type="button" onClick={() => setRequestedSamples(v => Math.min(v * 2, 32))}
                className="rounded-xl bg-[#000B36] px-4 py-2 text-xs font-black text-white">Refine all matchup pools</button>
            ) : null}
            {state.status !== "ready" ? <button type="button" onClick={() => setPaused(value => !value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-[#000B36]">
              {paused ? "Resume" : "Pause"}
            </button> : null}
          </div>
        </div>
        <div role="progressbar" aria-label="Futures calculation progress" aria-valuenow={state.status === "projecting" || state.status === "ready" ? state.seasons : state.complete}
          aria-valuemin={0} aria-valuemax={state.status === "projecting" || state.status === "ready" ? FUTURE_RUNS : state.total}
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[#18BDFC] transition-[width] duration-300"
            style={{ width: `${state.status === "projecting" || state.status === "ready" ? (100 * state.seasons / FUTURE_RUNS) : progress}%` }} />
        </div>
        <p className="mt-2 text-xs tabular-nums text-slate-500">{state.pairs} / {teams.length * (teams.length - 1)} matchup orientations sampled · {remainingPairs.length} remaining-season matchup orientations prioritized</p>
        {state.status === "error" ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{state.error}</p> : null}
      </section>
      {result ? <>
        <section className="rounded-2xl border border-[#000B36]/10 bg-white p-4 text-sm text-slate-600">
          {result.remainingGames} schedule games remain. Model odds are fair empirical frequencies, not sportsbook lines.
          With limited V7 samples per matchup, the futures should be treated as experimental.
        </section>
        {mode === "divisions" ? <DivisionView teams={teams} counts={result.divisionWins} /> : null}
        {mode === "presidents" ? <LeagueFuturesView teams={teams} counts={result.presidents} eyebrow="Best regular-season record" title="Presidents' Trophy Odds" /> : null}
        {mode === "cup" ? <LeagueFuturesView teams={teams} counts={result.cups} eyebrow="League championship" title="Cup Odds" /> : null}
      </> : <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600">
        Season percentages are withheld until all required ordered matchups have actual V7 results. No old-model estimates or invented probabilities are substituted.
      </section>}
    </div>
  );
}
