"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { teams } from "../../data/teams";

const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation, team]));
const pct = (value, digits = 1) => `${((Number(value) || 0) * 100).toFixed(digits)}%`;
const savePct = (value) => (Number(value) || 0).toFixed(3);
const decimal = (value, digits = 2) => (Number(value) || 0).toFixed(digits);
const plusMinus = (value) => { const number = Number(value) || 0; return number > 0 ? `+${number}` : String(number); };
function clock(seconds) { const value = Math.max(0, Math.round(Number(seconds) || 0)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }
function TeamLink({ abbreviation }) { const team = teamByAbbreviation[abbreviation]; return team ? <Link href={`/teams/${team.slug}`} className="font-black hover:text-[#A90117]">{abbreviation}</Link> : <span>{abbreviation}</span>; }
const selectClass = "rounded-xl border border-[#000B36]/12 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/15";

export default function CurrentSeasonStatsExplorer({ skaters, goalies, teamStats }) {
  const [tab, setTab] = useState("skaters");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [sort, setSort] = useState("points");

  const sortOptions = tab === "skaters"
    ? [["points", "Points"], ["goals", "Goals"], ["assists", "Assists"], ["shots", "Shots"], ["shotPct", "S%"], ["hits", "Hits"], ["faceoffsWon", "FOW"], ["faceoffPct", "FO%"], ["toi", "TOI"]]
    : tab === "goalies"
      ? [["savePct", "SV%"], ["saves", "Saves"], ["shotsAgainst", "Shots Against"], ["gaaLow", "GAA"], ["toi", "Minutes"]]
      : [["points", "Points"], ["wins", "Wins"], ["goalsFor", "Goals For"], ["goalsAgainstLow", "Goals Against"], ["goalDifferential", "Goal Differential"], ["powerPlayPct", "Power Play %"]];

  const rows = useMemo(() => {
    const source = tab === "skaters" ? skaters : tab === "goalies" ? goalies : teamStats;
    const normalized = query.trim().toLowerCase();
    const filtered = source.filter((row) => {
      const abbreviation = tab === "teams" ? row.abbreviation : row.team;
      if (team && abbreviation !== team) return false;
      if (!normalized) return true;
      const teamInfo = teamByAbbreviation[abbreviation];
      return [row.name, row.playerId, abbreviation, teamInfo?.name].filter(Boolean).join(" ").toLowerCase().includes(normalized);
    });
    const value = (row) => {
      if (sort === "gaaLow") return -(Number(row.gaa) || 0);
      if (sort === "goalsAgainstLow") return -(Number(row.goalsAgainst) || 0);
      return Number(row[sort]) || 0;
    };
    return [...filtered].sort((a, b) => value(b) - value(a) || String(a.name || a.abbreviation).localeCompare(String(b.name || b.abbreviation)));
  }, [goalies, query, skaters, sort, tab, team, teamStats]);

  function switchTab(next) { setTab(next); setSort(next === "skaters" ? "points" : next === "goalies" ? "savePct" : "points"); }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[["skaters", "Skaters"], ["goalies", "Goalies"], ["teams", "Teams"]].map(([value, label]) => (
          <button key={value} type="button" onClick={() => switchTab(value)} className={`rounded-full px-5 py-2.5 text-sm font-black transition ${tab === value ? "bg-[#000B36] text-white" : "border border-[#000B36]/12 bg-white hover:border-[#18BDFC]"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === "teams" ? "Search team…" : "Search player or ID…"} className="rounded-xl border border-[#000B36]/12 px-4 py-2.5 text-sm font-bold outline-none focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/15" />
        <select value={team} onChange={(event) => setTeam(event.target.value)} className={selectClass} aria-label="Filter by team"><option value="">All teams</option>{teams.map((candidate) => <option key={candidate.abbreviation} value={candidate.abbreviation}>{candidate.name}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className={selectClass} aria-label="Sort statistics">{sortOptions.map(([value, label]) => <option key={value} value={value}>Sort: {label}</option>)}</select>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {tab === "skaters" ? (
            <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
              <thead className="bg-[#000B36] text-[10px] font-black uppercase tracking-[0.12em] text-white/70"><tr><th className="px-5 py-3">Player</th><th className="px-3 py-3">Team</th>{["GP","G","A","PTS","+/-","S","S%","PIM","Hits","PPG","SHG","FOW","FO%","TOI"].map((h)=><th key={h} className="px-3 py-3 text-center">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#000B36]/8">{rows.map((row) => <tr key={row.playerId} className="hover:bg-[#F6F8FC]"><td className="px-5 py-3"><Link href={`/players/${row.playerId}`} className="font-black hover:text-[#A90117]">{row.name}</Link><span className="ml-2 text-[10px] font-bold text-[#000B36]/35">{row.playerId}</span></td><td className="px-3 py-3"><TeamLink abbreviation={row.team} /></td><td className="px-3 py-3 text-center">{row.gp}</td><td className="px-3 py-3 text-center">{row.goals}</td><td className="px-3 py-3 text-center">{row.assists}</td><td className="px-3 py-3 text-center font-black">{row.points}</td><td className="px-3 py-3 text-center">{plusMinus(row.plusMinus)}</td><td className="px-3 py-3 text-center">{row.shots}</td><td className="px-3 py-3 text-center">{pct(row.shotPct)}</td><td className="px-3 py-3 text-center">{row.penaltyMinutes}</td><td className="px-3 py-3 text-center">{row.hits}</td><td className="px-3 py-3 text-center">{row.powerPlayGoals}</td><td className="px-3 py-3 text-center">{row.shorthandedGoals}</td><td className="px-3 py-3 text-center">{row.faceoffsWon}</td><td className="px-3 py-3 text-center">{pct(row.faceoffPct)}</td><td className="px-3 py-3 text-center">{clock(row.toi)}</td></tr>)}</tbody>
            </table>
          ) : tab === "goalies" ? (
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-[#000B36] text-[10px] font-black uppercase tracking-[0.12em] text-white/70"><tr><th className="px-5 py-3">Goalie</th><th className="px-3 py-3">Team</th>{["GP","MIN","SA","SV","SV%","GA","GAA","ENG","PIM","PTS"].map((h)=><th key={h} className="px-3 py-3 text-center">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#000B36]/8">{rows.map((row) => <tr key={row.playerId} className="hover:bg-[#F6F8FC]"><td className="px-5 py-3"><Link href={`/players/${row.playerId}`} className="font-black hover:text-[#A90117]">{row.name}</Link><span className="ml-2 text-[10px] font-bold text-[#000B36]/35">{row.playerId}</span></td><td className="px-3 py-3"><TeamLink abbreviation={row.team} /></td><td className="px-3 py-3 text-center">{row.gp}</td><td className="px-3 py-3 text-center">{clock(row.toi)}</td><td className="px-3 py-3 text-center">{row.shotsAgainst}</td><td className="px-3 py-3 text-center">{row.saves}</td><td className="px-3 py-3 text-center font-black">{savePct(row.savePct)}</td><td className="px-3 py-3 text-center">{row.goalsAgainst}</td><td className="px-3 py-3 text-center">{decimal(row.gaa)}</td><td className="px-3 py-3 text-center">{row.emptyNetGoals}</td><td className="px-3 py-3 text-center">{row.penaltyMinutes}</td><td className="px-3 py-3 text-center">{row.points}</td></tr>)}</tbody>
            </table>
          ) : (
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="bg-[#000B36] text-[10px] font-black uppercase tracking-[0.12em] text-white/70"><tr><th className="px-5 py-3">Team</th>{["GP","W","L","OTL","PTS","GF","GA","GD","S/G","HIT/G","PASS","PP%","PIM/G"].map((h)=><th key={h} className="px-3 py-3 text-center">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#000B36]/8">{rows.map((row) => { const info=teamByAbbreviation[row.abbreviation]; return <tr key={row.abbreviation} className="hover:bg-[#F6F8FC]"><td className="px-5 py-3"><Link href={`/teams/${info?.slug || ""}`} className="font-black hover:text-[#A90117]">{info?.name || row.abbreviation}</Link></td><td className="px-3 py-3 text-center">{row.gp}</td><td className="px-3 py-3 text-center">{row.wins}</td><td className="px-3 py-3 text-center">{row.losses}</td><td className="px-3 py-3 text-center">{row.otl}</td><td className="px-3 py-3 text-center font-black">{row.points}</td><td className="px-3 py-3 text-center">{row.goalsFor}</td><td className="px-3 py-3 text-center">{row.goalsAgainst}</td><td className="px-3 py-3 text-center">{plusMinus(row.goalDifferential)}</td><td className="px-3 py-3 text-center">{decimal(row.shotsPerGame,1)}</td><td className="px-3 py-3 text-center">{decimal(row.hitsPerGame,1)}</td><td className="px-3 py-3 text-center">{pct(row.passing)}</td><td className="px-3 py-3 text-center">{pct(row.powerPlayPct)}</td><td className="px-3 py-3 text-center">{decimal(row.penaltyMinutesPerGame,1)}</td></tr>; })}</tbody>
            </table>
          )}
        </div>
        {rows.length === 0 ? <div className="p-10 text-center"><p className="text-xl font-black">No 2026–27 stats yet.</p><p className="mt-2 text-sm font-semibold text-[#000B36]/45">Official SIM submissions and manually entered SNS game rows will appear here automatically.</p></div> : null}
      </div>
    </div>
  );
}
