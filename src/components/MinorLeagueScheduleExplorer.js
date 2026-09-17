"use client";

import { useMemo, useState } from "react";
import MinorLeagueGameCard from "@/components/MinorLeagueGameCard";
import { minorTeams } from "../../data/minorTeams";
import { formatScheduleDate, formatScheduleMonth } from "@/lib/scheduleFormat";

const INITIAL_DATE_COUNT = 14;

export default function MinorLeagueScheduleExplorer({ schedule }) {
  const [query, setQuery] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [visibleDateCount, setVisibleDateCount] = useState(INITIAL_DATE_COUNT);

  const teamLookup = useMemo(() => Object.fromEntries(minorTeams.map((team) => [team.slug, team])), []);
  const teamOptions = useMemo(() => [...minorTeams].sort((a, b) => a.name.localeCompare(b.name)), []);
  const seasonMonths = useMemo(() => [...new Set(schedule.map((game) => game.date.slice(0, 7)))].sort(), [schedule]);

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return schedule.filter((game) => {
      const away = teamLookup[game.away];
      const home = teamLookup[game.home];
      if (!away || !home) return false;
      if (teamSlug && game.away !== teamSlug && game.home !== teamSlug) return false;
      if (month && !game.date.startsWith(month)) return false;
      if (date && game.date !== date) return false;
      if (venue === "home" && teamSlug && game.home !== teamSlug) return false;
      if (venue === "away" && teamSlug && game.away !== teamSlug) return false;
      if (normalized) {
        const searchable = [away.name, away.city, away.nickname, away.abbreviation, home.name, home.city, home.nickname, home.abbreviation].join(" ").toLowerCase();
        if (!searchable.includes(normalized)) return false;
      }
      return true;
    });
  }, [date, month, query, schedule, teamLookup, teamSlug, venue]);

  const groupedGames = useMemo(() => {
    const groups = [];
    for (const game of filteredGames) {
      const last = groups[groups.length - 1];
      if (!last || last.date !== game.date) groups.push({ date: game.date, games: [game] });
      else last.games.push(game);
    }
    return groups;
  }, [filteredGames]);

  function resetFilters() {
    setQuery("");
    setTeamSlug("");
    setMonth("");
    setDate("");
    setVenue("");
    setVisibleDateCount(INITIAL_DATE_COUNT);
  }

  const selectClass = "w-full rounded-2xl border border-[#000B36]/12 bg-white px-4 py-3 text-sm font-bold text-[#000B36] outline-none transition focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/15";
  const visibleGroups = groupedGames.slice(0, visibleDateCount);

  return (
    <div>
      <section className="rounded-[2rem] border border-[#000B36]/10 bg-white p-5 shadow-[0_12px_40px_rgba(0,11,54,0.06)] md:p-7">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Search matchups</span>
            <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleDateCount(INITIAL_DATE_COUNT); }} placeholder="Team, city, nickname, or abbreviation…" className={selectClass} />
          </label>
          <label>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Team</span>
            <select value={teamSlug} onChange={(event) => { setTeamSlug(event.target.value); setVenue(""); setVisibleDateCount(INITIAL_DATE_COUNT); }} className={selectClass}>
              <option value="">All 40 teams</option>
              {teamOptions.map((team) => <option key={team.slug} value={team.slug}>{team.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Month</span>
            <select value={month} onChange={(event) => { setMonth(event.target.value); setVisibleDateCount(INITIAL_DATE_COUNT); }} className={selectClass}>
              <option value="">Entire season</option>
              {seasonMonths.map((value) => <option key={value} value={value}>{formatScheduleMonth(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Exact date</span>
            <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setVisibleDateCount(INITIAL_DATE_COUNT); }} className={selectClass} />
          </label>
          <label>
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Venue for selected team</span>
            <select value={venue} disabled={!teamSlug} onChange={(event) => { setVenue(event.target.value); setVisibleDateCount(INITIAL_DATE_COUNT); }} className={`${selectClass} disabled:cursor-not-allowed disabled:bg-[#F1F4F8] disabled:text-[#000B36]/30`}>
              <option value="">Home and away</option>
              <option value="home">Home only</option>
              <option value="away">Away only</option>
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={resetFilters} className="w-full rounded-2xl border border-[#000B36]/12 px-4 py-3 text-sm font-black transition hover:border-[#A90117] hover:text-[#A90117]">Clear filters</button>
          </div>
        </div>
      </section>

      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Minor League schedule</p>
          <h2 className="mt-1 text-3xl font-black">{filteredGames.length.toLocaleString()} game{filteredGames.length === 1 ? "" : "s"}</h2>
        </div>
        <p className="text-sm font-bold text-[#000B36]/42">{groupedGames.length} date{groupedGames.length === 1 ? "" : "s"}</p>
      </div>

      <div className="mt-7 space-y-10">
        {visibleGroups.map((group) => (
          <section key={group.date} className="scroll-mt-28">
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-[#000B36]/10 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#000B36]/35">Day {group.games[0].day}</p>
                <h3 className="mt-1 text-2xl font-black md:text-3xl">{formatScheduleDate(group.date)}</h3>
              </div>
              <span className="text-xs font-black uppercase tracking-wide text-[#000B36]/32">{group.games.length} games</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {group.games.map((game) => <MinorLeagueGameCard key={game.id} game={game} focusTeamSlug={teamSlug || null} />)}
            </div>
          </section>
        ))}
      </div>

      {visibleDateCount < groupedGames.length ? (
        <div className="mt-10 text-center">
          <button onClick={() => setVisibleDateCount((count) => count + 14)} className="rounded-full bg-[#000B36] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#00145C]">Load more dates</button>
        </div>
      ) : null}

      {!filteredGames.length ? (
        <div className="mt-10 rounded-3xl border border-dashed border-[#000B36]/20 bg-white p-10 text-center">
          <p className="text-2xl font-black">No games match those filters.</p>
          <button onClick={resetFilters} className="mt-3 text-sm font-black text-[#A90117]">Clear all filters</button>
        </div>
      ) : null}
    </div>
  );
}
