"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 75;
const SEASONS = ["Career", "2025-26", "2024-25", "2023-24", "2022-23"];

function pct(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(3).replace(/^0/, "");
}

function statLine(player, season) {
  if (season === "Career") return player.career;
  return player.seasons.find((row) => row.season === season) || null;
}

export default function HistoricalPlayerStatsExplorer({ players }) {
  const [role, setRole] = useState("Skater");
  const [season, setSeason] = useState("Career");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("primary");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSortBy("primary");
  }, [role, season, query]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = players
      .filter((player) => player.role === role)
      .filter((player) => !needle || `${player.name} ${player.id}`.toLowerCase().includes(needle))
      .map((player) => ({ ...player, stats: statLine(player, season) }));

    rows.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (role === "Goalie") {
        if (sortBy === "sa") return (b.stats?.sa || 0) - (a.stats?.sa || 0) || a.name.localeCompare(b.name);
        if (sortBy === "sv") return (b.stats?.sv || 0) - (a.stats?.sv || 0) || a.name.localeCompare(b.name);
        return (b.stats?.svPct || 0) - (a.stats?.svPct || 0) || (b.stats?.sv || 0) - (a.stats?.sv || 0) || a.name.localeCompare(b.name);
      }
      if (sortBy === "g") return (b.stats?.g || 0) - (a.stats?.g || 0) || (b.stats?.pts || 0) - (a.stats?.pts || 0) || a.name.localeCompare(b.name);
      if (sortBy === "a") return (b.stats?.a || 0) - (a.stats?.a || 0) || (b.stats?.pts || 0) - (a.stats?.pts || 0) || a.name.localeCompare(b.name);
      return (b.stats?.pts || 0) - (a.stats?.pts || 0) || (b.stats?.g || 0) - (a.stats?.g || 0) || a.name.localeCompare(b.name);
    });

    return rows;
  }, [players, role, season, query, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const goalie = role === "Goalie";

  return (
    <div>
      <div className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">Player type</p>
            <div className="mt-2 flex rounded-full bg-[#F1F4F9] p-1">
              {[["Skater", "Skaters"], ["Goalie", "Goalies"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => setRole(value)} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${role === value ? "bg-[#000B36] text-white" : "text-[#000B36]/50 hover:text-[#000B36]"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Player name or AVHL ID" className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#18BDFC] focus:bg-white" />
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">Season</span>
            <select value={season} onChange={(event) => setSeason(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-4 py-3 text-sm font-black outline-none focus:border-[#18BDFC]">
              {SEASONS.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-4 py-3 text-sm font-black outline-none focus:border-[#18BDFC]">
              <option value="primary">{goalie ? "Save percentage" : "Points"}</option>
              {goalie ? <option value="sv">Saves</option> : <option value="g">Goals</option>}
              {goalie ? <option value="sa">Shots against</option> : <option value="a">Assists</option>}
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#000B36]/8 pt-5">
          <p className="text-sm font-black">{filtered.length.toLocaleString()} <span className="font-bold text-[#000B36]/40">{goalie ? "goalies" : "skaters"}</span></p>
          <p className="text-xs font-bold text-[#000B36]/40">Historical season rows intentionally do not assign a team.</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] border-collapse text-left">
            <thead className="bg-[#000B36] text-[10px] font-black uppercase tracking-[0.14em] text-white/65">
              <tr>
                <th className="px-5 py-3.5">Player</th>
                {goalie ? (
                  <>
                    <th className="px-5 py-3.5 text-center">SA</th>
                    <th className="px-5 py-3.5 text-center">SV</th>
                    <th className="px-5 py-3.5 text-center">SV%</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3.5 text-center">G</th>
                    <th className="px-5 py-3.5 text-center">A</th>
                    <th className="px-5 py-3.5 text-center">PTS</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000B36]/8">
              {visible.map((player) => (
                <tr key={player.id} className="transition hover:bg-[#F8FAFD]">
                  <td className="px-5 py-3.5">
                    <Link href={`/players/${player.id}`} className="font-black hover:text-[#A90117] hover:underline">
                      {player.name}
                    </Link>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/32">AVHL ID {player.id}</p>
                  </td>
                  {goalie ? (
                    <>
                      <td className="px-5 py-3.5 text-center text-sm font-bold tabular-nums">{player.stats?.sa ?? 0}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-bold tabular-nums">{player.stats?.sv ?? 0}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-black tabular-nums">{pct(player.stats?.svPct ?? 0)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3.5 text-center text-sm font-bold tabular-nums">{player.stats?.g ?? 0}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-bold tabular-nums">{player.stats?.a ?? 0}</td>
                      <td className="px-5 py-3.5 text-center text-sm font-black tabular-nums">{player.stats?.pts ?? 0}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {visibleCount < filtered.length ? (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-full bg-[#000B36] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#A90117]">
            Load more players
          </button>
        </div>
      ) : null}
    </div>
  );
}
