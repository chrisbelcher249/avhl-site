"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const columns = [
  { key: "teamName", label: "Team" },
  { key: "playerName", label: "Player" },
  { key: "position", label: "Pos" },
  { key: "overall", label: "OVR" },
  { key: "injuryType", label: "Injury" },
  { key: "injuryDate", label: "Date Injured" },
  { key: "gamesRemaining", label: "Games Remaining" },
  { key: "expectedReturnDate", label: "Expected Return" },
];
const numericKeys = new Set(["overall", "gamesRemaining"]);
const dateKeys = new Set(["injuryDate", "expectedReturnDate"]);

function dateLabel(value) {
  if (!value) return "After season / TBD";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}
function cellValue(injury, key) {
  if (key === "overall") return Number.isFinite(Number(injury.overall)) && injury.overall !== null ? Number(injury.overall) : null;
  if (numericKeys.has(key)) return Number(injury[key]) || 0;
  return injury[key] || null;
}
function compareInjuries(a, b, key, direction) {
  const left = cellValue(a, key);
  const right = cellValue(b, key);
  // Missing dates and OVR always sort last, regardless of direction.
  if (left == null && right != null) return 1;
  if (right == null && left != null) return -1;
  if (left == null && right == null) return a.playerName.localeCompare(b.playerName);
  const difference = numericKeys.has(key)
    ? left - right
    : dateKeys.has(key)
      ? String(left).localeCompare(String(right))
      : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return (direction === "asc" ? difference : -difference) || a.playerName.localeCompare(b.playerName);
}

export default function InjuriesTable({ injuries = [], teams = [] }) {
  const [teamFilter, setTeamFilter] = useState("");
  const [sort, setSort] = useState({ key: "teamName", direction: "asc" });
  const teamByCode = useMemo(() => Object.fromEntries(teams.map((team) => [team.abbreviation, team])), [teams]);
  const filtered = useMemo(
    () => injuries.filter((injury) => !teamFilter || injury.teamAbbreviation === teamFilter)
      .sort((a, b) => compareInjuries(a, b, sort.key, sort.direction)),
    [injuries, teamFilter, sort]
  );
  const changeSort = (key) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#000B36]/10 bg-[#F6F8FC] px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#000B36]/45">Active injury report</p>
          <p className="mt-1 text-sm font-bold text-[#000B36]/65">{filtered.length} of {injuries.length} active injuries · Select any column heading to sort</p>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-black text-[#000B36]/70">
          Filter by team
          <select
            aria-label="Filter injuries by team"
            value={teamFilter}
            onChange={(event) => setTeamFilter(event.target.value)}
            className="min-w-[220px] rounded-xl border border-[#000B36]/15 bg-white px-3 py-2.5 text-sm font-bold text-[#000B36] outline-none focus:ring-2 focus:ring-[#18BDFC]"
          >
            <option value="">All teams</option>
            {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
              <option key={team.abbreviation} value={team.abbreviation}>{team.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <thead className="bg-[#000B36] text-white">
            <tr className="text-[10px] font-black uppercase tracking-[0.11em]">
              {columns.map(({ key, label }) => {
                const active = sort.key === key;
                return (
                  <th key={key} scope="col" aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                    className={`px-3 py-3.5 ${key === "gamesRemaining" || key === "overall" ? "text-center" : "text-left"}`}>
                    <button type="button" onClick={() => changeSort(key)}
                      className="inline-flex items-center gap-1.5 text-left transition hover:text-cyan-200 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
                      {label}
                      <span aria-hidden="true" className={active ? "text-cyan-200" : "text-white/40"}>
                        {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#000B36]/8">
            {filtered.map((injury) => {
              const team = teamByCode[injury.teamAbbreviation];
              return (
                <tr key={injury.storageKey || `${injury.officialGameId}:${injury.playerId}`} className="hover:bg-[#F8FAFD]">
                  <td className="px-3 py-4">
                    <Link href={team ? `/teams/${team.slug}` : "/teams"} className="flex items-center gap-2 font-black hover:text-[#A90117]">
                      {team?.logo ? <Image src={team.logo} alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" /> : null}
                      <span>{injury.teamAbbreviation}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-sm"><Link href={`/players/${injury.playerId}`} className="font-black hover:text-[#A90117]">{injury.playerName}</Link></td>
                  <td className="px-3 py-4 text-sm font-bold">{injury.position || "—"}</td>
                  <td className="px-3 py-4 text-center text-sm font-black tabular-nums">{injury.overall ?? "—"}</td>
                  <td className="px-3 py-4 text-sm font-bold">{injury.injuryType}</td>
                  <td className="px-3 py-4 text-sm font-bold tabular-nums">{injury.injuryDate ? dateLabel(injury.injuryDate) : "—"}</td>
                  <td className="px-3 py-4 text-center text-base font-black tabular-nums">{injury.gamesRemaining}</td>
                  <td className="px-3 py-4 text-sm font-bold tabular-nums">{dateLabel(injury.expectedReturnDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-lg font-black">{teamFilter ? "No active injuries for this team." : "No active injuries."}</p>
          {teamFilter ? <button type="button" onClick={() => setTeamFilter("")} className="mt-3 text-sm font-bold text-[#A90117] underline">Show all teams</button> : <p className="mt-2 text-sm font-semibold text-[#000B36]/45">Official injuries appear after a game is saved.</p>}
        </div>
      ) : null}
    </section>
  );
}
