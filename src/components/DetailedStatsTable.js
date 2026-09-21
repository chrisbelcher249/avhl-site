"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const percent = (value, digits = 1) => `${((Number(value) || 0) * 100).toFixed(digits)}%`;
const savePct = (value) => (Number(value) || 0).toFixed(3);
const plusMinus = (value) => {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
};
const clock = (seconds) => {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

const SKATER_COLUMNS = [
  { key: "name", label: "Player", align: "left" },
  { key: "team", label: "Team" },
  { key: "position", label: "Pos" },
  { key: "gp", label: "GP", number: true },
  { key: "goals", label: "G", number: true },
  { key: "assists", label: "A", number: true },
  { key: "points", label: "PTS", number: true, strong: true },
  { key: "plusMinus", label: "+/-", number: true, format: plusMinus },
  { key: "shots", label: "S", number: true },
  { key: "shotPct", label: "S%", number: true, format: (value) => percent(value) },
  { key: "penaltyMinutes", label: "PIM", number: true },
  { key: "hits", label: "Hits", number: true },
  { key: "powerPlayGoals", label: "PPG", number: true },
  { key: "shorthandedGoals", label: "SHG", number: true },
  { key: "faceoffsTaken", label: "FOT", number: true },
  { key: "faceoffsWon", label: "FOW", number: true },
  { key: "faceoffPct", label: "FO%", number: true, format: (value) => percent(value) },
  { key: "toi", label: "TOI", number: true, format: clock },
  { key: "toiPerGame", label: "TOI/GP", number: true, format: clock },
  { key: "ppToi", label: "PP TOI", number: true, format: clock },
  { key: "ppToiPerGame", label: "PP TOI/GP", number: true, format: clock },
];

const GOALIE_COLUMNS = [
  { key: "name", label: "Goalie", align: "left" },
  { key: "team", label: "Team" },
  { key: "gp", label: "GP", number: true },
  { key: "dressed", label: "Dressed", number: true },
  { key: "toi", label: "MIN", number: true, format: clock },
  { key: "shotsAgainst", label: "SA", number: true },
  { key: "saves", label: "SV", number: true },
  { key: "savePct", label: "SV%", number: true, format: savePct, strong: true },
  { key: "goalsAgainst", label: "GA", number: true },
  { key: "gaa", label: "GAA", number: true, format: (value) => (Number(value) || 0).toFixed(2) },
  { key: "emptyNetGoals", label: "ENG", number: true },
  { key: "penaltyMinutes", label: "PIM", number: true },
  { key: "goals", label: "G", number: true },
  { key: "assists", label: "A", number: true },
  { key: "points", label: "PTS", number: true },
];

function compareValues(a, b, column) {
  const av = a?.[column.key];
  const bv = b?.[column.key];
  if (column.number) {
    const an = Number(av) || 0;
    const bn = Number(bv) || 0;
    return an - bn;
  }
  return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { sensitivity: "base" });
}

export default function DetailedStatsTable({ type, rows }) {
  const goalie = type === "goalie";
  const columns = goalie ? GOALIE_COLUMNS : SKATER_COLUMNS;
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState(goalie ? { key: "gp", direction: "desc" } : { key: "points", direction: "desc" });

  const teams = useMemo(() => [...new Set(rows.map((row) => row.team).filter(Boolean))].sort(), [rows]);

  const displayedRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const column = columns.find((item) => item.key === sort.key) || columns[0];
    return rows
      .filter((row) => team === "ALL" || row.team === team)
      .filter((row) => !needle || `${row.name} ${row.team} ${row.position || ""} ${row.playerId}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const primary = compareValues(a, b, column);
        if (primary !== 0) return sort.direction === "asc" ? primary : -primary;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
  }, [columns, query, rows, sort, team]);

  const changeSort = (key) => {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: columns.find((item) => item.key === key)?.number ? "desc" : "asc" });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search players</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={goalie ? "Search goalies…" : "Search skaters…"}
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F7F9FC] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#18BDFC]"
            />
          </label>
          <label>
            <span className="sr-only">Filter by team</span>
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              className="min-w-36 rounded-2xl border border-[#000B36]/12 bg-[#F7F9FC] px-4 py-3 text-sm font-black outline-none transition focus:border-[#18BDFC]"
            >
              <option value="ALL">All teams</option>
              {teams.map((abbreviation) => <option key={abbreviation} value={abbreviation}>{abbreviation}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#000B36]/35">{displayedRows.length} players</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse text-sm ${goalie ? "min-w-[1180px]" : "min-w-[1750px]"}`}>
            <thead className="bg-[#000B36] text-[10px] font-black uppercase tracking-[0.12em] text-white/70">
              <tr>
                {columns.map((column) => {
                  const active = sort.key === column.key;
                  return (
                    <th key={column.key} className={`${column.align === "left" ? "text-left" : "text-center"} px-3 py-0 first:px-5`}>
                      <button
                        type="button"
                        onClick={() => changeSort(column.key)}
                        className={`inline-flex min-h-11 w-full items-center gap-1.5 py-3 ${column.align === "left" ? "justify-start" : "justify-center"} transition hover:text-white ${active ? "text-white" : ""}`}
                        title={`Sort by ${column.label}`}
                      >
                        <span>{column.label}</span>
                        <span aria-hidden="true" className={`text-[9px] ${active ? "opacity-100" : "opacity-25"}`}>{active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000B36]/8">
              {displayedRows.map((row) => (
                <tr key={row.playerId} className="transition hover:bg-[#F7F9FC]">
                  {columns.map((column) => {
                    const raw = row[column.key];
                    const value = column.format ? column.format(raw) : raw;
                    if (column.key === "name") {
                      return (
                        <td key={column.key} className="whitespace-nowrap px-5 py-3.5 text-left">
                          <Link href={`/players/${row.playerId}`} className="font-black hover:text-[#A90117]">{row.name}</Link>
                          <span className="ml-2 text-[10px] font-bold text-[#000B36]/30">#{row.playerId}</span>
                        </td>
                      );
                    }
                    return (
                      <td key={column.key} className={`whitespace-nowrap px-3 py-3.5 text-center tabular-nums ${column.strong ? "font-black" : "font-semibold"}`}>
                        {value ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!displayedRows.length ? <p className="p-8 text-center text-sm font-semibold text-[#000B36]/45">No players match those filters.</p> : null}
      </div>
    </div>
  );
}
