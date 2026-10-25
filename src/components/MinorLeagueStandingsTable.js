"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LEAGUE_STANDINGS_COLUMNS, sortLeagueStandings } from "@/lib/leagueStandingsSort";

export default function MinorLeagueStandingsTable({ standings, completedGames }) {
  const [sort, setSort] = useState({ key: "rank", direction: "asc" });
  const rankedRows = sortLeagueStandings(standings, sort);
  const officialRankOrder = sort.key === "rank" && sort.direction === "asc";
  const handleSort = (key) => setSort((previous) => ({
    key,
    direction: previous.key === key
      ? previous.direction === "asc" ? "desc" : "asc"
      : key === "team" || key === "rank" ? "asc" : "desc",
  }));
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-[0_12px_40px_rgba(0,11,54,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[#000B36]/10 bg-[#000724] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between md:px-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">League table</p>
          <h2 className="mt-1 text-2xl font-black">2026–27 Minor League Standings</h2>
        </div>
        <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
          Top 3 promoted
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-sm">
          <thead className="bg-[#000B36] text-white">
            <tr className="text-[9px] font-black uppercase tracking-[0.12em]">
              {LEAGUE_STANDINGS_COLUMNS.map(({ key, label }) => {
                const active = sort.key === key;
                const direction = active ? sort.direction : null;
                return (
                  <th key={key} scope="col" aria-sort={active ? direction === "asc" ? "ascending" : "descending" : "none"} className={`px-2 py-0 ${key === "team" ? "text-left" : "text-center"}`}>
                    <button type="button" onClick={() => handleSort(key)} title={`Sort by ${label}`} className={`inline-flex min-h-11 w-full items-center gap-1.5 px-1 py-3.5 transition hover:text-cyan-200 ${key === "team" ? "justify-start" : "justify-center"}`}>
                      <span>{label}</span>
                      <span className={`text-[9px] ${active ? "opacity-100" : "opacity-40"}`} aria-hidden="true">
                        {active ? direction === "asc" ? "▲" : "▼" : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rankedRows.map(({ record, officialRank }, index) => {
              const promotion = completedGames > 0 && officialRank <= 3;
              return (
                <tr key={record.team.slug} className={`relative border-t border-[#000B36]/8 ${promotion ? "bg-cyan-50/80" : "bg-white"}`}>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${promotion ? "bg-[#000B36] text-cyan-200" : "bg-[#F1F4F8] text-[#000B36]/58"}`}>
                      {completedGames ? officialRank : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/minor-league/${record.team.slug}`} className="group flex items-center gap-3">
                      <Image src={record.team.assets.logo} alt="" width={44} height={44} className="h-9 w-9 object-contain transition group-hover:scale-105" />
                      <div className="min-w-0">
                        <p className="truncate font-black group-hover:text-[#A90117]">{record.team.name}</p>
                        {promotion ? <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#0088B5]">Promotion position</p> : null}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center font-black">{record.gp}</td>
                  <td className="px-3 py-3 text-center font-black">{record.wins}</td>
                  <td className="px-3 py-3 text-center font-black">{record.losses}</td>
                  <td className="px-3 py-3 text-center font-black">{record.otl}</td>
                  <td className="px-3 py-3 text-center text-base font-black">{record.pts}</td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{Number(record.ptsPct || 0).toFixed(3)}</td>
                  <td className="px-3 py-3 text-center font-black">{record.rw}</td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{record.gfPerGame.toFixed(2)}</td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">{record.gaPerGame.toFixed(2)}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.gf}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.ga}</td>
                  <td className={`px-3 py-3 text-center font-black ${record.gd > 0 ? "text-emerald-700" : record.gd < 0 ? "text-[#A90117]" : ""}`}>{record.gd > 0 ? `+${record.gd}` : record.gd}</td>
                </tr>
              );
            }).reduce((rows, row, index) => {
              rows.push(row);
              if (officialRankOrder && index === 2) {
                rows.push(
                  <tr key="promotion-cutoff" aria-hidden="true">
                    <td colSpan={14} className="p-0">
                      <div className="relative h-10 bg-gradient-to-r from-cyan-50 via-white to-cyan-50">
                        <div className="absolute inset-x-4 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-[#18BDFC] to-transparent" />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#18BDFC]/40 bg-[#000B36] px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200 shadow-sm">
                          Promotion line · Top 3
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }
              return rows;
            }, [])}
          </tbody>
        </table>
      </div>
    </div>
  );
}
