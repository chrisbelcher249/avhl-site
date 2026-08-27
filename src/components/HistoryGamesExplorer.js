"use client";

import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compactDate(value) {
  if (!value) return "—";
  return value;
}

function gameMatchesTeam(game, query) {
  if (!query) return true;
  const needle = normalize(query);
  return normalize(game.away).includes(needle) || normalize(game.home).includes(needle);
}

function gameMatchesOpponent(game, teamQuery, opponentQuery) {
  if (!opponentQuery) return true;
  const opponentNeedle = normalize(opponentQuery);
  const teamNeedle = normalize(teamQuery);

  if (!teamNeedle) {
    return normalize(game.away).includes(opponentNeedle) || normalize(game.home).includes(opponentNeedle);
  }

  const awayMatchesTeam = normalize(game.away).includes(teamNeedle);
  const homeMatchesTeam = normalize(game.home).includes(teamNeedle);

  if (awayMatchesTeam && normalize(game.home).includes(opponentNeedle)) return true;
  if (homeMatchesTeam && normalize(game.away).includes(opponentNeedle)) return true;
  return false;
}

export default function HistoryGamesExplorer({ seasons, expectedCount = 0 }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [season, setSeason] = useState("all");
  const [teamQuery, setTeamQuery] = useState("");
  const [opponentQuery, setOpponentQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      try {
        const response = await fetch("/data/history-games.json", { cache: "force-cache" });
        if (!response.ok) throw new Error(`Historical games request failed (${response.status})`);
        const data = await response.json();
        if (!cancelled) {
          setGames(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Historical games could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGames();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [season, teamQuery, opponentQuery, dateQuery, sortDirection]);

  const filteredGames = useMemo(() => {
    const dateNeedle = normalize(dateQuery);
    const filtered = games.filter((game) => {
      if (season !== "all" && game.season !== season) return false;
      if (!gameMatchesTeam(game, teamQuery)) return false;
      if (!gameMatchesOpponent(game, teamQuery, opponentQuery)) return false;
      if (dateNeedle) {
        const raw = normalize(game.date);
        const iso = normalize(game.dateIso);
        if (!raw.includes(dateNeedle) && !iso.includes(dateNeedle)) return false;
      }
      return true;
    });

    return sortDirection === "asc" ? filtered : [...filtered].reverse();
  }, [dateQuery, games, opponentQuery, season, sortDirection, teamQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageGames = filteredGames.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const start = filteredGames.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * PAGE_SIZE, filteredGames.length);

  function clearFilters() {
    setSeason("all");
    setTeamQuery("");
    setOpponentQuery("");
    setDateQuery("");
    setSortDirection("asc");
  }

  return (
    <div>
      <div className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSeason("all")}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${season === "all" ? "bg-[#000B36] text-white" : "bg-[#F1F4F9] text-[#000B36]/62 hover:bg-[#E4EAF3]"}`}
          >
            All seasons
          </button>
          {seasons.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSeason(value)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${season === value ? "bg-[#000B36] text-white" : "bg-[#F1F4F9] text-[#000B36]/62 hover:bg-[#E4EAF3]"}`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_0.8fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Team</span>
            <input
              value={teamQuery}
              onChange={(event) => setTeamQuery(event.target.value)}
              placeholder="Search any historical team"
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/28 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Opponent</span>
            <input
              value={opponentQuery}
              onChange={(event) => setOpponentQuery(event.target.value)}
              placeholder="Optional opponent search"
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/28 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">Date</span>
            <input
              value={dateQuery}
              onChange={(event) => setDateQuery(event.target.value)}
              placeholder="10/12/22 or 2022-10-12"
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/28 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setSortDirection((value) => (value === "asc" ? "desc" : "asc"))}
              className="min-h-11 flex-1 rounded-2xl border border-[#000B36]/12 bg-[#F8FAFD] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#000B36] transition hover:bg-[#EEF2F8]"
            >
              {sortDirection === "asc" ? "Oldest first" : "Newest first"}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-11 rounded-2xl bg-[#A90117] px-4 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#8E0114]"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#000B36]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#A90117]">Game archive</p>
            <p className="mt-1 text-sm font-bold text-[#000B36]/55">
              {loading ? "Loading historical games…" : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${filteredGames.length.toLocaleString()} matches`}
            </p>
          </div>
          {!loading && !error ? (
            <p className="text-xs font-bold text-[#000B36]/38">
              {games.length.toLocaleString()} loaded{expectedCount && games.length !== expectedCount ? ` · expected ${expectedCount.toLocaleString()}` : ""}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="px-6 py-10 text-center">
            <p className="font-black text-[#A90117]">Historical games could not be loaded.</p>
            <p className="mt-2 text-sm font-semibold text-[#000B36]/48">{error}</p>
          </div>
        ) : null}

        {!error && loading ? <p className="px-6 py-12 text-center text-sm font-bold text-[#000B36]/42">Loading the completed-game archive…</p> : null}

        {!error && !loading && pageGames.length ? (
          <div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[940px] w-full border-collapse text-sm">
                <thead className="bg-[#000B36] text-white">
                  <tr>
                    <th className="px-4 py-4 text-left font-black">Season</th>
                    <th className="px-4 py-4 text-center font-black">Game</th>
                    <th className="px-4 py-4 text-left font-black">Date</th>
                    <th className="px-4 py-4 text-right font-black">Away</th>
                    <th className="px-4 py-4 text-center font-black">Score</th>
                    <th className="px-4 py-4 text-left font-black">Home</th>
                    <th className="px-4 py-4 text-center font-black">OT/SO</th>
                  </tr>
                </thead>
                <tbody>
                  {pageGames.map((game) => {
                    const awayWon = game.winner === game.away;
                    const homeWon = game.winner === game.home;
                    return (
                      <tr key={`${game.season}-${game.game}`} className="border-t border-[#000B36]/8 transition hover:bg-[#F8FAFD]">
                        <td className="px-4 py-4 font-black text-[#000B36]/55">{game.season}</td>
                        <td className="px-4 py-4 text-center font-bold tabular-nums text-[#000B36]/42">#{game.game}</td>
                        <td className="px-4 py-4 font-bold tabular-nums text-[#000B36]/62">{compactDate(game.date)}</td>
                        <td className={`px-4 py-4 text-right ${awayWon ? "font-black text-[#000B36]" : "font-bold text-[#000B36]/58"}`}>{game.away}</td>
                        <td className="px-4 py-4 text-center text-base font-black tabular-nums text-[#000B36]">{game.awayScore}–{game.homeScore}</td>
                        <td className={`px-4 py-4 ${homeWon ? "font-black text-[#000B36]" : "font-bold text-[#000B36]/58"}`}>{game.home}</td>
                        <td className="px-4 py-4 text-center">
                          {game.ot ? <span className="rounded-full bg-[#E7F9FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#006785]">{game.ot}</span> : <span className="text-[#000B36]/22">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#000B36]/8 md:hidden">
              {pageGames.map((game) => (
                <div key={`${game.season}-${game.game}`} className="p-5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.13em] text-[#000B36]/38">
                    <span>{game.season} · Game #{game.game}</span>
                    <span>{compactDate(game.date)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <p className={`text-right text-sm ${game.winner === game.away ? "font-black" : "font-bold text-[#000B36]/60"}`}>{game.away}</p>
                    <p className="text-xl font-black tabular-nums">{game.awayScore}–{game.homeScore}</p>
                    <p className={`text-sm ${game.winner === game.home ? "font-black" : "font-bold text-[#000B36]/60"}`}>{game.home}</p>
                  </div>
                  {game.ot ? <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#006785]">{game.ot}</p> : null}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-[#000B36]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold text-[#000B36]/42">Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="rounded-full border border-[#000B36]/12 px-4 py-2 text-xs font-black uppercase tracking-wide transition enabled:hover:bg-[#F1F4F9] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  className="rounded-full bg-[#000B36] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition enabled:hover:bg-[#06154D] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!error && !loading && !pageGames.length ? (
          <p className="px-6 py-12 text-center text-sm font-bold text-[#000B36]/45">No historical games match those filters.</p>
        ) : null}
      </div>
    </div>
  );
}
