"use client";

import { useMemo, useState } from "react";

const columns = [
  ["rank", "#"],
  ["season", "Season"],
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
  ["gf", "GF"],
  ["ga", "GA"],
  ["gd", "GD"],
];

const numericKeys = new Set(["rank", "gp", "w", "l", "otl", "pts", "ptsPct", "rw", "gfPerGame", "gaPerGame", "gf", "ga", "gd"]);

const statFilterOptions = [
  ["pts", "Points"],
  ["ptsPct", "Points %"],
  ["w", "Wins"],
  ["rw", "Regulation wins"],
  ["gf", "Goals for"],
  ["ga", "Goals against"],
  ["gd", "Goal differential"],
  ["gfPerGame", "Goals for / game"],
  ["gaPerGame", "Goals against / game"],
  ["gp", "Games played"],
];

function displayValue(key, value) {
  if (key === "ptsPct") return Number(value).toFixed(3).replace(/^0/, "");
  if (key === "gfPerGame" || key === "gaPerGame") return Number(value).toFixed(2);
  if (key === "gd") return value > 0 ? `+${value}` : String(value);
  return String(value);
}

function parseBound(key, value) {
  if (value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (key === "ptsPct" && parsed > 1) return parsed / 100;
  return parsed;
}

function rankKey(row) {
  return `${row.season}-${row.franchiseCode}-${row.team}`;
}

export default function HistoryExplorer({ seasons, rows }) {
  const [selectedSeasons, setSelectedSeasons] = useState([...seasons]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "pts", direction: "desc" });
  const [statFilter, setStatFilter] = useState("pts");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");

  const allSelected = selectedSeasons.length === seasons.length;

  const rankedRows = useMemo(() => {
    const rankMap = new Map();

    seasons.forEach((season) => {
      rows
        .filter((row) => row.season === season)
        .sort((a, b) => b.pts - a.pts || b.rw - a.rw || b.gd - a.gd || b.gf - a.gf || b.w - a.w)
        .forEach((row, index) => rankMap.set(rankKey(row), index + 1));
    });

    return rankMap;
  }, [rows, seasons]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const minValue = parseBound(statFilter, minimum);
    const maxValue = parseBound(statFilter, maximum);

    const filtered = rows.filter((row) => {
      if (!selectedSeasons.includes(row.season)) return false;

      if (needle) {
        const matchesSearch = [row.team, row.currentFranchiseName, row.franchiseCode, row.season]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
        if (!matchesSearch) return false;
      }

      const statValue = Number(row[statFilter]);
      if (minValue !== null && statValue < minValue) return false;
      if (maxValue !== null && statValue > maxValue) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const av = sort.key === "rank" ? rankedRows.get(rankKey(a)) : a[sort.key];
      const bv = sort.key === "rank" ? rankedRows.get(rankKey(b)) : b[sort.key];
      let result;

      if (numericKeys.has(sort.key)) result = Number(av) - Number(bv);
      else result = String(av ?? "").localeCompare(String(bv ?? ""));

      if (result === 0) {
        result = a.season.localeCompare(b.season) || a.team.localeCompare(b.team);
      }

      return sort.direction === "asc" ? result : -result;
    });
  }, [maximum, minimum, query, rankedRows, rows, selectedSeasons, sort, statFilter]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key ? (current.direction === "desc" ? "asc" : "desc") : key === "team" || key === "season" || key === "rank" ? "asc" : "desc",
    }));
  }

  function toggleSeason(value) {
    setSelectedSeasons((current) => {
      if (current.length === seasons.length) return [value];
      if (current.includes(value)) {
        if (current.length === 1) return [...seasons];
        return current.filter((season) => season !== value);
      }
      return seasons.filter((season) => current.includes(season) || season === value);
    });
  }

  function clearFilters() {
    setSelectedSeasons([...seasons]);
    setQuery("");
    setStatFilter("pts");
    setMinimum("");
    setMaximum("");
    setSort({ key: "pts", direction: "desc" });
  }

  return (
    <div>
      <div className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSeasons([...seasons])}
            aria-pressed={allSelected}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${allSelected ? "bg-[#000B36] text-white" : "bg-[#F1F4F9] text-[#000B36]/62 hover:bg-[#E4EAF3]"}`}
          >
            All seasons
          </button>
          {seasons.map((value) => {
            const active = !allSelected && selectedSeasons.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleSeason(value)}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${active ? "bg-[#000B36] text-white" : "bg-[#F1F4F9] text-[#000B36]/62 hover:bg-[#E4EAF3]"}`}
              >
                {value}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.9fr_0.55fr_0.55fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Team</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team or franchise code"
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/30 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Stat filter</span>
            <select
              value={statFilter}
              onChange={(event) => setStatFilter(event.target.value)}
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            >
              {statFilterOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Minimum</span>
            <input
              inputMode="decimal"
              value={minimum}
              onChange={(event) => setMinimum(event.target.value)}
              placeholder="Min"
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/30 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Maximum</span>
            <input
              inputMode="decimal"
              value={maximum}
              onChange={(event) => setMaximum(event.target.value)}
              placeholder="Max"
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/30 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 w-full rounded-2xl bg-[#A90117] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#8E0114] lg:w-auto"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1 text-xs font-bold text-[#000B36]/42 sm:flex-row sm:items-center sm:justify-between">
          <p>{visibleRows.length.toLocaleString()} team-season{visibleRows.length === 1 ? "" : "s"} shown</p>
          <p>Click any column to sort · PTS% accepts .600 or 60</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full border-collapse text-sm">
            <thead className="bg-[#000B36] text-white">
              <tr>
                {columns.map(([key, label]) => (
                  <th key={key} scope="col" className={`px-4 py-4 font-black ${key === "team" || key === "season" ? "text-left" : "text-center"}`}>
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
                const rank = rankedRows.get(rankKey(row));
                const historicalIdentity = row.team !== row.currentFranchiseName;
                return (
                  <tr key={`${row.season}-${row.franchiseCode}-${row.team}`} className="border-t border-[#000B36]/8 transition hover:bg-[#F8FAFD]">
                    <td className="px-4 py-4 text-center font-black tabular-nums text-[#000B36]/45">{rank}</td>
                    <td className="px-4 py-4 whitespace-nowrap font-black text-[#000B36]/58">{row.season}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-[#000B36]">{row.team}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#000B36]/35">
                        {historicalIdentity ? `${row.franchiseCode} · now ${row.currentFranchiseName}` : row.franchiseCode}
                      </p>
                    </td>
                    {columns.slice(3).map(([key]) => (
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
        {!visibleRows.length ? <p className="px-6 py-10 text-center text-sm font-bold text-[#000B36]/45">No historical team-seasons match those filters.</p> : null}
      </div>
    </div>
  );
}
