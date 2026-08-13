"use client";

import { useMemo, useState } from "react";

function pct(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(3).replace(/^0/, "");
}

function PlayerDetails({ player, type, onClose, primary }) {
  if (!player) return null;
  const statBlocks = type === "goalies"
    ? [
        ["2025–26 SV%", pct(player.season.svPct)],
        ["2025–26 saves", player.season.sv],
        ["Career SV%", pct(player.career.svPct)],
        ["Career saves", player.career.sv],
      ]
    : [
        ["2025–26 G", player.season.g],
        ["2025–26 A", player.season.a],
        ["2025–26 PTS", player.season.pts],
        ["Career PTS", player.career.pts],
      ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#000724]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#000B36]/10 bg-white/95 px-6 py-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black text-white" style={{ backgroundColor: primary }}>
              {player.number ?? "—"}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#000B36]/40">AVHL ID {player.id}</p>
              <h3 className="mt-1 text-2xl font-black md:text-3xl">{player.name}</h3>
              <p className="mt-1 text-sm font-bold text-[#000B36]/55">{player.position} · {player.nhlTeam || "NHL club unavailable"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#000B36]/10 px-3 py-2 text-sm font-black hover:bg-[#F6F8FC]" aria-label="Close player details">✕</button>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statBlocks.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F6F8FC] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/40">{label}</p>
                <p className="mt-2 text-2xl font-black">{value ?? "—"}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Overall", player.overall],
              ["Age", player.age],
              ["Contract", `${player.yearsLeft ?? "—"} yr${Number(player.yearsLeft) === 1 ? "" : "s"} left`],
              ["Size", [player.height, player.weight ? `${player.weight} lb` : null].filter(Boolean).join(" · ") || "—"],
              [type === "goalies" ? "Glove" : "Shoots", player.glove || player.shot || "—"],
              ["Player type", player.playerType || (type === "goalies" ? "Goaltender" : "—")],
              ["Birthdate", player.birthdate || "—"],
              ["Jersey", player.number ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#000B36]/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/40">{label}</p>
                <p className="mt-1.5 text-sm font-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Player ratings</p>
                <h4 className="mt-1 text-2xl font-black">Key attributes</h4>
              </div>
              <span className="rounded-full px-3 py-1.5 text-sm font-black text-white" style={{ backgroundColor: primary }}>{player.overall} OVR</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(player.ratings || {}).filter(([, value]) => value !== null && value !== undefined).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#000B36]/10 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#000B36]/8">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`, backgroundColor: primary }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RosterSection({ roster, primary }) {
  const hasSkaters = roster.skaters.length > 0;
  const hasGoalies = roster.goalies.length > 0;
  const [type, setType] = useState(hasSkaters ? "skaters" : "goalies");
  const [selected, setSelected] = useState(null);

  const players = useMemo(() => {
    const list = type === "goalies" ? roster.goalies : roster.skaters;
    return [...list].sort((a, b) => (b.overall || 0) - (a.overall || 0) || String(a.name).localeCompare(String(b.name)));
  }, [roster, type]);

  if (!roster.count) {
    return (
      <div className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white p-8 text-center md:p-12">
        <p className="text-2xl font-black">No returning players listed.</p>
        <p className="mt-2 text-sm font-semibold text-[#000B36]/50">This team has no returning players in the supplied 2026–27 roster workbook.</p>
      </div>
    );
  }

  const isGoalie = type === "goalies";
  return (
    <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#000B36]/10 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">2026–27 roster foundation</p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">Returning players</h2>
          <p className="mt-1 text-sm font-semibold text-[#000B36]/45">{roster.count} total · {roster.skaters.length} skaters · {roster.goalies.length} goalies</p>
        </div>
        <div className="flex rounded-full bg-[#F1F4F9] p-1">
          <button disabled={!hasSkaters} onClick={() => setType("skaters")} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${type === "skaters" ? "bg-[#000B36] text-white" : "text-[#000B36]/55"} disabled:opacity-30`}>Skaters</button>
          <button disabled={!hasGoalies} onClick={() => setType("goalies")} className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${type === "goalies" ? "bg-[#000B36] text-white" : "text-[#000B36]/55"} disabled:opacity-30`}>Goalies</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-[#F6F8FC] text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/45">
            <tr>
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Player</th>
              <th className="px-5 py-3">Pos</th>
              <th className="px-5 py-3 text-center">OVR</th>
              <th className="px-5 py-3 text-center">Age</th>
              <th className="px-5 py-3 text-center">Years left</th>
              <th className="px-5 py-3 text-center">{isGoalie ? "25–26 SV%" : "25–26 PTS"}</th>
              <th className="px-5 py-3 text-center">{isGoalie ? "Career SV%" : "Career PTS"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#000B36]/8">
            {players.map((player) => (
              <tr key={player.id} className="transition hover:bg-[#F8FAFD]">
                <td className="px-5 py-4 text-sm font-black text-[#000B36]/40">{player.number ?? "—"}</td>
                <td className="px-5 py-4">
                  <button onClick={() => setSelected(player)} className="text-left font-black hover:underline" style={{ textDecorationColor: primary }}>
                    {player.name}
                    <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-[#A90117]">details</span>
                  </button>
                  <p className="mt-0.5 text-xs font-semibold text-[#000B36]/40">{player.nhlTeam || `AVHL ID ${player.id}`}</p>
                </td>
                <td className="px-5 py-4 text-sm font-bold">{player.position || "—"}</td>
                <td className="px-5 py-4 text-center"><span className="inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-sm font-black text-white" style={{ backgroundColor: primary }}>{player.overall ?? "—"}</span></td>
                <td className="px-5 py-4 text-center text-sm font-bold">{player.age ?? "—"}</td>
                <td className="px-5 py-4 text-center text-sm font-bold">{player.yearsLeft ?? "—"}</td>
                <td className="px-5 py-4 text-center text-sm font-black">{isGoalie ? pct(player.season.svPct) : player.season.pts}</td>
                <td className="px-5 py-4 text-center text-sm font-black">{isGoalie ? pct(player.career.svPct) : player.career.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PlayerDetails player={selected} type={type} primary={primary} onClose={() => setSelected(null)} />
    </div>
  );
}
