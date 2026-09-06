"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function money(value) {
  return value === null || value === undefined ? "—" : currency.format(value);
}

function pct(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(3).replace(/^0/, "");
}

const DEFAULT_DIRECTIONS = {
  number: "asc",
  name: "asc",
  position: "asc",
  overall: "desc",
  age: "asc",
  yearsLeft: "desc",
  aav: "desc",
  seasonStat: "desc",
  careerStat: "desc",
};

function sortableValue(player, key, isGoalie) {
  switch (key) {
    case "number": {
      const parsed = Number.parseInt(player.number, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "name":
      return String(player.name || "").toLowerCase();
    case "position":
      return String(player.position || "").toLowerCase();
    case "overall":
      return player.overall ?? null;
    case "age":
      return player.age ?? null;
    case "yearsLeft":
      return player.yearsLeft ?? null;
    case "aav":
      return player.aav ?? null;
    case "seasonStat":
      return isGoalie ? player.season?.svPct ?? null : player.season?.pts ?? null;
    case "careerStat":
      return isGoalie ? player.career?.svPct ?? null : player.career?.pts ?? null;
    default:
      return null;
  }
}

function compareValues(a, b, direction) {
  if (a === null || a === undefined || a === "") return b === null || b === undefined || b === "" ? 0 : 1;
  if (b === null || b === undefined || b === "") return -1;

  let result;
  if (typeof a === "string" || typeof b === "string") {
    result = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
  } else {
    result = Number(a) - Number(b);
  }
  return direction === "asc" ? result : -result;
}

function SortHeader({ label, column, sort, onSort, align = "left" }) {
  const active = sort.key === column;
  const arrow = active ? (sort.direction === "asc" ? "▲" : "▼") : "↕";
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";

  return (
    <th className={`px-5 py-3 ${align === "center" ? "text-center" : "text-left"}`} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-[#000B36] ${align === "center" ? "justify-center" : "justify-start"} ${active ? "text-[#000B36]" : "text-[#000B36]/45"}`}
        title={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className={`text-[8px] ${active ? "text-[#A90117]" : "text-[#000B36]/25"}`} aria-hidden="true">{arrow}</span>
      </button>
    </th>
  );
}

export default function RosterSection({ roster, primary }) {
  const hasSkaters = roster.skaters.length > 0;
  const hasGoalies = roster.goalies.length > 0;
  const [type, setType] = useState(hasSkaters ? "skaters" : "goalies");
  const [sort, setSort] = useState({ key: "overall", direction: "desc" });

  const isGoalie = type === "goalies";

  const players = useMemo(() => {
    const list = type === "goalies" ? roster.goalies : roster.skaters;
    return [...list].sort((a, b) => {
      const primaryComparison = compareValues(
        sortableValue(a, sort.key, isGoalie),
        sortableValue(b, sort.key, isGoalie),
        sort.direction
      );
      if (primaryComparison !== 0) return primaryComparison;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    });
  }, [roster, type, sort, isGoalie]);

  function handleSort(key) {
    setSort((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: DEFAULT_DIRECTIONS[key] || "asc" };
    });
  }

  function switchType(nextType) {
    setType(nextType);
    setSort({ key: "overall", direction: "desc" });
  }

  if (!roster.count) {
    return (
      <div className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white p-8 text-center md:p-12">
        <p className="text-2xl font-black">No current players listed.</p>
        <p className="mt-2 text-sm font-semibold text-[#000B36]/50">This team has no assigned players in the supplied 2026–27 player database.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#000B36]/10 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">2026–27 active roster</p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">Current roster</h2>
          <p className="mt-1 text-sm font-semibold text-[#000B36]/45">
            {roster.count} total · {roster.skaters.length} skaters · {roster.goalies.length} goalies · click any column to sort
          </p>
        </div>
        <div className="flex rounded-full bg-[#F1F4F9] p-1">
          <button disabled={!hasSkaters} onClick={() => switchType("skaters")} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${type === "skaters" ? "bg-[#000B36] text-white" : "text-[#000B36]/55"} disabled:opacity-30`}>Skaters</button>
          <button disabled={!hasGoalies} onClick={() => switchType("goalies")} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${type === "goalies" ? "bg-[#000B36] text-white" : "text-[#000B36]/55"} disabled:opacity-30`}>Goalies</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="bg-[#F6F8FC] text-[10px] font-black uppercase tracking-[0.14em]">
            <tr>
              <SortHeader label="#" column="number" sort={sort} onSort={handleSort} />
              <SortHeader label="Player" column="name" sort={sort} onSort={handleSort} />
              <SortHeader label="Pos" column="position" sort={sort} onSort={handleSort} />
              <SortHeader label="OVR" column="overall" sort={sort} onSort={handleSort} align="center" />
              <SortHeader label="Age" column="age" sort={sort} onSort={handleSort} align="center" />
              <SortHeader label="Years left" column="yearsLeft" sort={sort} onSort={handleSort} align="center" />
              <SortHeader label="AAV" column="aav" sort={sort} onSort={handleSort} align="center" />
              <SortHeader label={isGoalie ? "25–26 SV%" : "25–26 PTS"} column="seasonStat" sort={sort} onSort={handleSort} align="center" />
              <SortHeader label={isGoalie ? "Career SV%" : "Career PTS"} column="careerStat" sort={sort} onSort={handleSort} align="center" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#000B36]/8">
            {players.map((player) => (
              <tr key={player.id} className="transition hover:bg-[#F8FAFD]">
                <td className="px-5 py-4 text-sm font-black text-[#000B36]/40">{player.number ?? "—"}</td>
                <td className="px-5 py-4">
                  <Link href={`/players/${player.id}`} className="font-black hover:underline" style={{ textDecorationColor: primary }}>
                    {player.name}
                    <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-[#A90117]">profile</span>
                  </Link>
                  <p className="mt-0.5 text-xs font-semibold text-[#000B36]/40">{player.proTeam || `AVHL ID ${player.id}`}</p>
                </td>
                <td className="px-5 py-4 text-sm font-bold">{player.position || "—"}</td>
                <td className="px-5 py-4 text-center"><span className="inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-sm font-black text-white" style={{ backgroundColor: primary }}>{player.overall ?? "—"}</span></td>
                <td className="px-5 py-4 text-center text-sm font-bold">{player.age ?? "—"}</td>
                <td className="px-5 py-4 text-center text-sm font-bold">{player.yearsLeft ?? "—"}</td>
                <td className="px-5 py-4 text-center text-sm font-black">{money(player.aav)}</td>
                <td className="px-5 py-4 text-center text-sm font-black">{isGoalie ? pct(player.season.svPct) : player.season.pts}</td>
                <td className="px-5 py-4 text-center text-sm font-black">{isGoalie ? pct(player.career.svPct) : player.career.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
