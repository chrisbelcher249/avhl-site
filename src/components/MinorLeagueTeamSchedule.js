"use client";

import { useMemo, useState } from "react";
import MinorLeagueGameCard from "@/components/MinorLeagueGameCard";
import { formatScheduleDate, formatScheduleMonth } from "@/lib/scheduleFormat";

export default function MinorLeagueTeamSchedule({ teamSlug, games, primary }) {
  const months = useMemo(() => [...new Set(games.map((game) => game.date.slice(0, 7)))], [games]);
  const [month, setMonth] = useState("");
  const [venue, setVenue] = useState("");
  const filteredGames = useMemo(() => games.filter((game) => {
    if (month && !game.date.startsWith(month)) return false;
    if (venue === "home" && game.home !== teamSlug) return false;
    if (venue === "away" && game.away !== teamSlug) return false;
    return true;
  }), [games, month, teamSlug, venue]);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#000B36]/38">Team schedule</p>
          <p className="mt-1 text-lg font-black">Showing {filteredGames.length} of {games.length} games</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-full border border-[#000B36]/12 bg-white px-4 py-2.5 text-sm font-black outline-none focus:border-[#18BDFC]">
            <option value="">All months</option>
            {months.map((value) => <option key={value} value={value}>{formatScheduleMonth(value)}</option>)}
          </select>
          <select value={venue} onChange={(event) => setVenue(event.target.value)} className="rounded-full border border-[#000B36]/12 bg-white px-4 py-2.5 text-sm font-black outline-none focus:border-[#18BDFC]">
            <option value="">Home and away</option>
            <option value="home">Home only</option>
            <option value="away">Away only</option>
          </select>
          {(month || venue) ? <button onClick={() => { setMonth(""); setVenue(""); }} className="rounded-full px-4 py-2.5 text-sm font-black text-white" style={{ backgroundColor: primary }}>Reset</button> : null}
        </div>
      </div>

      <div className="mt-8 space-y-7">
        {filteredGames.map((game) => (
          <section key={game.id} className="grid gap-3 md:grid-cols-[190px_1fr] md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#A90117]">Day {game.day} · Game {game.id}</p>
              <h3 className="mt-1 text-xl font-black">{formatScheduleDate(game.date, { weekday: "short", year: undefined })}</h3>
            </div>
            <MinorLeagueGameCard game={game} focusTeamSlug={teamSlug} />
          </section>
        ))}
      </div>
    </div>
  );
}
