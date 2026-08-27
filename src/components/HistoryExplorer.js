"use client";

import { useMemo, useState } from "react";

const columns = [
  ["rank", "#"],
  ["team", "Team"],
  ["gp", "GP"],
  ["w", "W"],
  ["l", "L"],
  ["otl", "OTL"],
  ["pts", "PTS"],
  ["ptsPct", "PTS%"],
  ["rw", "RW"],
  ["gfPerGame", "GF/G"],
  ["gaPerGame", "GA/G"],
  ["gd", "GD"],
];

const numericKeys = new Set(["gp", "w", "l", "otl", "pts", "ptsPct", "rw", "gfPerGame", "gaPerGame", "gd"]);

function displayValue(key, value) {
  if (key === "ptsPct") return Number(value).toFixed(3).replace(/^0/, "");
  if (key === "gfPerGame" || key === "gaPerGame") return Number(value).toFixed(2);
  if (key === "gd") return value > 0 ? `+${value}` : String(value);
  return String(value);
}

export default function HistoryExplorer({ seasons, rows }) {
  const [season, setSeason] = useState(seasons[seasons.length - 1]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "pts", direction: "desc" });

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (row.season !== season) return false;
      if (!needle) return true;
      return [row.team, row.currentFranchiseName, row.franchiseCode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
    });

    return [...filtered].sort((a, b) => {
      if (sort.key === "rank") {
        const result = b.pts - a.pts || b.rw - a.rw || b.gd - a.gd || b.gf - a.gf || b.w - a.w;
        return sort.direction === "desc" ? result : -result;
      }
      const av = a[sort.key];
      const bv = b[sort.key];
      let result;
      if (numericKeys.has(sort.key)) result = Number(av) - Number(bv);
      else result = String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.direction === "asc" ? result : -result;
    });
  }, [query, rows, season, sort]);

  const rankedRows = useMemo(() => {
    const seasonRows = rows
      .filter((row) => row.season === season)
      .sort((a, b) => b.pts - a.pts || b.rw - a.rw || b.gd - a.gd || b.gf - a.gf || b.w - a.w);
    return new Map(seasonRows.map((row, index) => [`${row.franchiseCode}-${row.team}`, index + 1]));
  }, [rows, season]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex flex-wrap gap-2">
          {seasons.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSeason(value)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${season === value ? "bg-[#000B36] text-white" : "bg-[#F1F4F9] text-[#000B36]/62 hover:bg-[#E4EAF3]"}`}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="relative block w-full md:max-w-sm">
          <span className="sr-only">Search historical teams</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search team or franchise code"
            className="w-full rounded-full border border-[#000B36]/12 bg-[#F8FAFD] px-5 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/30 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
          />
        </label>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full border-collapse text-sm">
            <thead className="bg-[#000B36] text-white">
              <tr>
                {columns.map(([key, label]) => (
                  <th key={key} scope="col" className={`px-4 py-4 font-black ${key === "team" ? "text-left" : "text-center"}`}>
                    <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-cyan-200">
                      {label}
                      {sort.key === key ? <span className="text-[10px] text-cyan-200">{sort.direction === "desc" ? "▼" : "▲"}</span> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const rank = rankedRows.get(`${row.franchiseCode}-${row.team}`);
                const historicalIdentity = row.team !== row.currentFranchiseName;
                return (
                  <tr key={`${row.season}-${row.team}`} className="border-t border-[#000B36]/8 transition hover:bg-[#F8FAFD]">
                    <td className="px-4 py-4 text-center font-black tabular-nums text-[#000B36]/45">{rank}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-[#000B36]">{row.team}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#000B36]/35">
                        {historicalIdentity ? `${row.franchiseCode} · now ${row.currentFranchiseName}` : row.franchiseCode}
                      </p>
                    </td>
                    {columns.slice(2).map(([key]) => (
                      <td key={key} className={`px-4 py-4 text-center font-bold tabular-nums ${key === "pts" ? "text-base font-black" : "text-[#000B36]/70"}`}>
                        {displayValue(key, row[key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!visibleRows.length ? <p className="px-6 py-10 text-center text-sm font-bold text-[#000B36]/45">No historical teams match that search.</p> : null}
      </div>
    </div>
  );
}
