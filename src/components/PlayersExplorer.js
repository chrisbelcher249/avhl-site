"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { playerCounts, players } from "../../data/players";
import { teams } from "../../data/teams";

const PAGE_SIZE = 60;

const teamByName = Object.fromEntries(teams.map((team) => [team.name, team]));
const leagueOptions = [...new Set(players.map((player) => player.league).filter(Boolean))].sort();

function positionGroup(player) {
  if (player.role === "Goalie") return "Goalie";
  if (player.position.includes("LD") || player.position.includes("RD")) return "Defense";
  return "Forward";
}

function savePercentage(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(3).replace(/^0/, "");
}

function seasonLine(player) {
  if (player.role === "Goalie") {
    return `${savePercentage(player.season.svPct)} SV% · ${player.season.sa ?? 0} SA`;
  }
  return `${player.season.g ?? 0} G · ${player.season.a ?? 0} A · ${player.season.pts ?? 0} P`;
}

function PlayerCard({ player }) {
  const avhlTeam = teamByName[player.currentTeam];
  return (
    <article className="grid gap-4 rounded-2xl border border-[#000B36]/10 bg-white p-4 shadow-sm transition hover:border-[#18BDFC] md:grid-cols-[minmax(0,1.55fr)_minmax(0,1.2fr)_0.45fr_0.45fr_minmax(0,1.1fr)_minmax(0,1.05fr)] md:items-center md:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-black md:text-lg">{player.name}</h2>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-[#000B36]/30">#{player.id}</span>
        </div>
        <p className="mt-1 truncate text-xs font-bold text-[#000B36]/45">{player.playerType || player.role}</p>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 md:hidden">AVHL status</p>
        {avhlTeam ? (
          <Link href={`/teams/${avhlTeam.slug}`} className="mt-1 block truncate text-sm font-black text-[#000B36] hover:text-[#A90117] md:mt-0">
            {player.currentTeam}
          </Link>
        ) : (
          <span className="mt-1 inline-flex rounded-full bg-[#A90117]/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#A90117] md:mt-0">UFA</span>
        )}
        <p className="mt-1 text-[11px] font-bold text-[#000B36]/38">
          {player.yearsLeft ? `${player.yearsLeft} ${player.yearsLeft === 1 ? "year" : "years"} left` : "Unsigned"}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 md:hidden">Position</p>
        <p className="mt-1 text-sm font-black md:mt-0">{player.position}</p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 md:hidden">Overall</p>
        <span className="mt-1 inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-[#000B36] px-2 text-sm font-black text-white md:mt-0">
          {player.overall}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 md:hidden">Player details</p>
        <p className="mt-1 truncate text-sm font-black md:mt-0">Age {player.age} · {player.height} · {player.weight} lb</p>
        <p className="mt-1 truncate text-[11px] font-bold text-[#000B36]/38">{player.proTeam} · {player.league}</p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 md:hidden">2025–26</p>
        <p className="mt-1 text-sm font-black md:mt-0">{seasonLine(player)}</p>
      </div>
    </article>
  );
}

export default function PlayersExplorer() {
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [leagueFilter, setLeagueFilter] = useState("ALL");
  const [minimumOverall, setMinimumOverall] = useState("ALL");
  const [sortBy, setSortBy] = useState("overall");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, teamFilter, positionFilter, leagueFilter, minimumOverall, sortBy]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const minimum = minimumOverall === "ALL" ? 0 : Number(minimumOverall);

    const result = players.filter((player) => {
      const searchable = `${player.name} ${player.id} ${player.currentTeam} ${player.proTeam} ${player.position}`.toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (teamFilter === "UFA" && player.currentTeam !== "UFA") return false;
      if (teamFilter === "ROSTERED" && player.currentTeam === "UFA") return false;
      if (!["ALL", "UFA", "ROSTERED"].includes(teamFilter) && player.currentTeam !== teamFilter) return false;
      if (positionFilter !== "ALL" && positionGroup(player) !== positionFilter) return false;
      if (leagueFilter !== "ALL" && player.league !== leagueFilter) return false;
      if (player.overall < minimum) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "age-young") return a.age - b.age || b.overall - a.overall;
      if (sortBy === "age-old") return b.age - a.age || b.overall - a.overall;
      return b.overall - a.overall || a.name.localeCompare(b.name);
    });
  }, [query, teamFilter, positionFilter, leagueFilter, minimumOverall, sortBy]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  function clearFilters() {
    setQuery("");
    setTeamFilter("ALL");
    setPositionFilter("ALL");
    setLeagueFilter("ALL");
    setMinimumOverall("ALL");
    setSortBy("overall");
  }

  return (
    <div>
      <div className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-7">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.35fr_1fr_0.8fr_0.75fr_0.7fr_0.8fr]">
          <label className="lg:col-span-2 xl:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Search players</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, ID, team or pro club"
              className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/30 focus:border-[#18BDFC] focus:bg-white"
            />
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">AVHL team</span>
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="ALL">All players</option>
              <option value="UFA">All UFAs ({playerCounts.ufa.toLocaleString()})</option>
              <option value="ROSTERED">All rostered ({playerCounts.rostered.toLocaleString()})</option>
              {teams.slice().sort((a, b) => a.name.localeCompare(b.name)).map((team) => <option key={team.slug} value={team.name}>{team.name}</option>)}
            </select>
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Position</span>
            <select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="ALL">All positions</option>
              <option value="Forward">Forwards</option>
              <option value="Defense">Defense</option>
              <option value="Goalie">Goalies</option>
            </select>
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Pro league</span>
            <select value={leagueFilter} onChange={(event) => setLeagueFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="ALL">All leagues</option>
              {leagueOptions.map((league) => <option key={league} value={league}>{league}</option>)}
            </select>
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Minimum OVR</span>
            <select value={minimumOverall} onChange={(event) => setMinimumOverall(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="ALL">Any rating</option>
              <option value="80">80+</option>
              <option value="85">85+</option>
              <option value="90">90+</option>
            </select>
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="overall">Overall rating</option>
              <option value="name">Name A–Z</option>
              <option value="age-young">Youngest first</option>
              <option value="age-old">Oldest first</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#000B36]/8 pt-5">
          <p className="text-sm font-black">
            {filteredPlayers.length.toLocaleString()} <span className="font-bold text-[#000B36]/42">of {playerCounts.total.toLocaleString()} players</span>
          </p>
          <button type="button" onClick={clearFilters} className="rounded-full border border-[#000B36]/12 px-4 py-2 text-xs font-black uppercase tracking-wide transition hover:border-[#A90117] hover:text-[#A90117]">
            Clear filters
          </button>
        </div>
      </div>

      <div className="mt-6 hidden grid-cols-[minmax(0,1.55fr)_minmax(0,1.2fr)_0.45fr_0.45fr_minmax(0,1.1fr)_minmax(0,1.05fr)] gap-4 px-5 text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 md:grid">
        <span>Player</span><span>AVHL status</span><span>Pos.</span><span>OVR</span><span>Details</span><span>2025–26</span>
      </div>

      {visiblePlayers.length ? (
        <div className="mt-3 grid gap-3">
          {visiblePlayers.map((player) => <PlayerCard key={player.id} player={player} />)}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-[#000B36]/20 bg-white px-6 py-14 text-center">
          <h2 className="text-2xl font-black">No players found</h2>
          <p className="mt-2 text-sm font-semibold text-[#000B36]/48">Try changing the search or clearing one of the filters.</p>
        </div>
      )}

      {visibleCount < filteredPlayers.length ? (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-full bg-[#000B36] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#A90117]">
            Load more players
          </button>
        </div>
      ) : null}
    </div>
  );
}
