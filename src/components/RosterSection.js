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

export default function RosterSection({ roster, primary }) {
  const hasSkaters = roster.skaters.length > 0;
  const hasGoalies = roster.goalies.length > 0;
  const [type, setType] = useState(hasSkaters ? "skaters" : "goalies");

  const players = useMemo(() => {
    const list = type === "goalies" ? roster.goalies : roster.skaters;
    return [...list].sort((a, b) => (b.overall || 0) - (a.overall || 0) || String(a.name).localeCompare(String(b.name)));
  }, [roster, type]);

  if (!roster.count) {
    return (
      <div className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white p-8 text-center md:p-12">
        <p className="text-2xl font-black">No current players listed.</p>
        <p className="mt-2 text-sm font-semibold text-[#000B36]/50">This team has no assigned players in the supplied 2026–27 player database.</p>
      </div>
    );
  }

  const isGoalie = type === "goalies";
  return (
    <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#000B36]/10 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">2026–27 active roster</p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">Current roster</h2>
          <p className="mt-1 text-sm font-semibold text-[#000B36]/45">{roster.count} total · {roster.skaters.length} skaters · {roster.goalies.length} goalies</p>
        </div>
        <div className="flex rounded-full bg-[#F1F4F9] p-1">
          <button disabled={!hasSkaters} onClick={() => setType("skaters")} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${type === "skaters" ? "bg-[#000B36] text-white" : "text-[#000B36]/55"} disabled:opacity-30`}>Skaters</button>
          <button disabled={!hasGoalies} onClick={() => setType("goalies")} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${type === "goalies" ? "bg-[#000B36] text-white" : "text-[#000B36]/55"} disabled:opacity-30`}>Goalies</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="bg-[#F6F8FC] text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/45">
            <tr>
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Player</th>
              <th className="px-5 py-3">Pos</th>
              <th className="px-5 py-3 text-center">OVR</th>
              <th className="px-5 py-3 text-center">Age</th>
              <th className="px-5 py-3 text-center">Years left</th>
              <th className="px-5 py-3 text-center">AAV</th>
              <th className="px-5 py-3 text-center">{isGoalie ? "25–26 SV%" : "25–26 PTS"}</th>
              <th className="px-5 py-3 text-center">{isGoalie ? "Career SV%" : "Career PTS"}</th>
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
