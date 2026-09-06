"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { teams } from "../../data/teams";

const PAGE_SIZE = 60;

const teamByName = Object.fromEntries(teams.map((team) => [team.name, team]));
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

const SALARY_STEP = 100000;
const POSITION_OPTIONS = [
  ["LW", "Left wing"],
  ["C", "Center"],
  ["RW", "Right wing"],
  ["LD", "Left defense"],
  ["RD", "Right defense"],
  ["G", "Goalie"],
];
const ALL_POSITIONS = POSITION_OPTIONS.map(([value]) => value);

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

function contractLine(player) {
  if (!player.aav) return "Unsigned";
  const term = player.yearsLeft ? `${player.yearsLeft} ${player.yearsLeft === 1 ? "year" : "years"}` : "Term unavailable";
  return `${term} · ${currency.format(player.aav)} AAV`;
}

function hasPosition(player, position) {
  if (position === "ALL") return true;
  const positions = String(player.position || "").split("/").map((value) => value.trim()).filter(Boolean);
  if (position === "G") return player.role === "Goalie" || positions.includes("G");
  return positions.includes(position);
}

function RangeFilter({ label, min, max, step, minValue, maxValue, onMinChange, onMaxChange, formatValue }) {
  const display = formatValue || ((value) => value.toLocaleString());

  function changeMin(event) {
    const next = Math.min(Number(event.target.value), maxValue);
    onMinChange(next);
  }

  function changeMax(event) {
    const next = Math.max(Number(event.target.value), minValue);
    onMaxChange(next);
  }

  return (
    <fieldset className="min-w-0 rounded-2xl border border-[#000B36]/10 bg-[#F6F8FC] px-4 py-3">
      <legend className="px-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">{label}</legend>
      <div className="mt-1 flex items-center justify-between gap-3 text-sm font-black">
        <span>{display(minValue)}</span>
        <span className="text-[#000B36]/28">to</span>
        <span>{display(maxValue)}</span>
      </div>
      <div className="mt-3 grid gap-2">
        <label className="grid grid-cols-[2.6rem_1fr] items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[#000B36]/35">
          <span>Min</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={minValue}
            onChange={changeMin}
            className="w-full accent-[#A90117]"
            aria-label={`${label} minimum`}
          />
        </label>
        <label className="grid grid-cols-[2.6rem_1fr] items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[#000B36]/35">
          <span>Max</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={maxValue}
            onChange={changeMax}
            className="w-full accent-[#18BDFC]"
            aria-label={`${label} maximum`}
          />
        </label>
      </div>
    </fieldset>
  );
}

function PlayerCard({ player }) {
  const avhlTeam = teamByName[player.currentTeam];
  return (
    <article className="grid gap-4 rounded-2xl border border-[#000B36]/10 bg-white p-4 shadow-sm transition hover:border-[#18BDFC] md:grid-cols-[minmax(0,1.55fr)_minmax(0,1.2fr)_0.45fr_0.45fr_minmax(0,1.1fr)_minmax(0,1.05fr)] md:items-center md:px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/players/${player.id}`} className="truncate text-base font-black transition hover:text-[#A90117] hover:underline md:text-lg">{player.name}</Link>
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
        <p className="mt-1 text-[11px] font-bold text-[#000B36]/38">{contractLine(player)}</p>
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

export default function PlayersExplorer({ players, playerCounts }) {
  const leagueOptions = useMemo(() => [...new Set(players.map((player) => player.league).filter(Boolean))].sort(), [players]);
  const overallValues = players.map((player) => player.overall).filter(Number.isFinite);
  const salaryValues = players.map((player) => player.aav).filter((value) => Number.isFinite(value) && value > 0);
  const ageValues = players.map((player) => player.age).filter(Number.isFinite);
  const OVERALL_MIN = overallValues.length ? Math.min(...overallValues) : 0;
  const OVERALL_MAX = overallValues.length ? Math.max(...overallValues) : 100;
  const SALARY_MIN = salaryValues.length ? Math.min(...salaryValues) : 0;
  const SALARY_MAX = salaryValues.length ? Math.max(...salaryValues) : 20_000_000;
  const AGE_MIN = ageValues.length ? Math.min(...ageValues) : 17;
  const AGE_MAX = ageValues.length ? Math.max(...ageValues) : 45;
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("ALL");
  const [selectedPositions, setSelectedPositions] = useState(() => [...ALL_POSITIONS]);
  const [leagueFilter, setLeagueFilter] = useState("ALL");
  const [minimumOverall, setMinimumOverall] = useState(OVERALL_MIN);
  const [maximumOverall, setMaximumOverall] = useState(OVERALL_MAX);
  const [minimumSalary, setMinimumSalary] = useState(SALARY_MIN);
  const [maximumSalary, setMaximumSalary] = useState(SALARY_MAX);
  const [minimumAge, setMinimumAge] = useState(AGE_MIN);
  const [maximumAge, setMaximumAge] = useState(AGE_MAX);
  const [sortBy, setSortBy] = useState("overall");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const salaryFilterActive = minimumSalary !== SALARY_MIN || maximumSalary !== SALARY_MAX;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, teamFilter, selectedPositions, leagueFilter, minimumOverall, maximumOverall, minimumSalary, maximumSalary, minimumAge, maximumAge, sortBy]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const result = players.filter((player) => {
      const searchable = `${player.name} ${player.id} ${player.currentTeam} ${player.proTeam} ${player.position}`.toLowerCase();
      if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
      if (teamFilter === "UFA" && player.currentTeam !== "UFA") return false;
      if (teamFilter === "ROSTERED" && player.currentTeam === "UFA") return false;
      if (!["ALL", "UFA", "ROSTERED"].includes(teamFilter) && player.currentTeam !== teamFilter) return false;
      if (!selectedPositions.some((position) => hasPosition(player, position))) return false;
      if (leagueFilter !== "ALL" && player.league !== leagueFilter) return false;
      if (player.overall < minimumOverall || player.overall > maximumOverall) return false;
      if (!Number.isFinite(player.age) || player.age < minimumAge || player.age > maximumAge) return false;
      if (salaryFilterActive) {
        if (!player.aav) return false;
        if (player.aav < minimumSalary || player.aav > maximumSalary) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "salary") return (b.aav || 0) - (a.aav || 0) || b.overall - a.overall;
      if (sortBy === "age-young") return a.age - b.age || b.overall - a.overall;
      if (sortBy === "age-old") return b.age - a.age || b.overall - a.overall;
      return b.overall - a.overall || a.name.localeCompare(b.name);
    });
  }, [players, query, teamFilter, selectedPositions, leagueFilter, minimumOverall, maximumOverall, minimumSalary, maximumSalary, minimumAge, maximumAge, salaryFilterActive, sortBy]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  function togglePosition(position) {
    setSelectedPositions((current) =>
      current.includes(position)
        ? current.filter((value) => value !== position)
        : [...current, position]
    );
  }

  function clearFilters() {
    setQuery("");
    setTeamFilter("ALL");
    setSelectedPositions([...ALL_POSITIONS]);
    setLeagueFilter("ALL");
    setMinimumOverall(OVERALL_MIN);
    setMaximumOverall(OVERALL_MAX);
    setMinimumSalary(SALARY_MIN);
    setMaximumSalary(SALARY_MAX);
    setMinimumAge(AGE_MIN);
    setMaximumAge(AGE_MAX);
    setSortBy("overall");
  }

  return (
    <div>
      <div className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-7">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="md:col-span-2 xl:col-span-2">
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

          <fieldset className="rounded-2xl border border-[#000B36]/10 bg-[#F6F8FC] px-4 py-3 md:col-span-2 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Position · select all that apply</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPositions([...ALL_POSITIONS])}
                  className="text-[10px] font-black uppercase tracking-wide text-[#A90117] hover:text-[#000B36]"
                >
                  Select all
                </button>
                <span className="text-[#000B36]/20">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedPositions([])}
                  className="text-[10px] font-black uppercase tracking-wide text-[#000B36]/45 hover:text-[#A90117]"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POSITION_OPTIONS.map(([value, label]) => {
                const checked = selectedPositions.includes(value);
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition ${checked ? "border-[#18BDFC]/70 bg-white text-[#000B36] shadow-sm" : "border-[#000B36]/8 bg-white/45 text-[#000B36]/40 hover:border-[#000B36]/20"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePosition(value)}
                      className="h-4 w-4 accent-[#A90117]"
                    />
                    <span>{value}</span>
                    <span className="truncate font-bold text-[#000B36]/38">{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Pro league</span>
            <select value={leagueFilter} onChange={(event) => setLeagueFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="ALL">All leagues</option>
              {leagueOptions.map((league) => <option key={league} value={league}>{league}</option>)}
            </select>
          </label>

          <label>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/42">Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="mt-2 w-full rounded-xl border border-[#000B36]/12 bg-[#F6F8FC] px-3 py-3 text-sm font-bold outline-none focus:border-[#18BDFC]">
              <option value="overall">Overall rating</option>
              <option value="salary">Salary (highest)</option>
              <option value="name">Name A–Z</option>
              <option value="age-young">Youngest first</option>
              <option value="age-old">Oldest first</option>
            </select>
          </label>

          <RangeFilter
            label="Overall rating"
            min={OVERALL_MIN}
            max={OVERALL_MAX}
            step={1}
            minValue={minimumOverall}
            maxValue={maximumOverall}
            onMinChange={setMinimumOverall}
            onMaxChange={setMaximumOverall}
          />

          <RangeFilter
            label="AAV"
            min={SALARY_MIN}
            max={SALARY_MAX}
            step={SALARY_STEP}
            minValue={minimumSalary}
            maxValue={maximumSalary}
            onMinChange={setMinimumSalary}
            onMaxChange={setMaximumSalary}
            formatValue={(value) => compactCurrency.format(value)}
          />

          <RangeFilter
            label="Age"
            min={AGE_MIN}
            max={AGE_MAX}
            step={1}
            minValue={minimumAge}
            maxValue={maximumAge}
            onMinChange={setMinimumAge}
            onMaxChange={setMaximumAge}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#000B36]/8 pt-5">
          <div>
            <p className="text-sm font-black">
              {filteredPlayers.length.toLocaleString()} <span className="font-bold text-[#000B36]/42">of {playerCounts.total.toLocaleString()} players</span>
            </p>
            {salaryFilterActive ? <p className="mt-1 text-[11px] font-bold text-[#000B36]/40">Unsigned UFAs are excluded while an AAV range is active.</p> : null}
          </div>
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
