"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TeamMark from "@/components/TeamMark";
import { teamByAbbreviation } from "../../data/teams";

function assetsList(value) {
  return String(value || "").split(",").map((asset) => asset.trim()).filter(Boolean);
}

function TeamSide({ abbreviation, receives, playerNameIndex, playerNames }) {
  const team = teamByAbbreviation[abbreviation];
  const assets = assetsList(receives);

  return (
    <div className="min-w-0 rounded-2xl border border-[#000B36]/8 bg-[#F7F9FC] p-4 md:p-5">
      <div className="flex items-center gap-3">
        {team ? <TeamMark team={team} size="sm" framed={false} /> : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#000B36] text-sm font-black text-white">{abbreviation}</div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/35">Receives</p>
          {team ? (
            <Link href={`/teams/${team.slug}`} className="mt-1 block truncate text-base font-black hover:text-[#A90117] md:text-lg">{team.name}</Link>
          ) : (
            <p className="mt-1 text-base font-black md:text-lg">{abbreviation}</p>
          )}
        </div>
      </div>
      <ul className="mt-4 grid gap-2">
        {assets.map((asset) => {
          const normalized = asset.trim().toLowerCase();
          const simplified = normalized.replace(/\s*\([^)]*\)\s*$/, "").trim();
          const matchedName = playerNameIndex[normalized] ? normalized : playerNameIndex[simplified] ? simplified : playerNames.find((name) => normalized.includes(name));
          const playerId = matchedName ? playerNameIndex[matchedName] : null;
          return (
            <li key={asset} className="rounded-xl border border-[#000B36]/8 bg-white px-3 py-2.5 text-sm font-extrabold leading-5">
              {playerId ? <Link href={`/players/${playerId}`} className="hover:text-[#A90117] hover:underline">{asset}</Link> : asset}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function searchText(trade) {
  const teamA = teamByAbbreviation[trade.teamA];
  const teamB = teamByAbbreviation[trade.teamB];
  return [
    trade.teamA,
    teamA?.name,
    teamA?.city,
    teamA?.nickname,
    trade.teamAReceives,
    trade.teamB,
    teamB?.name,
    teamB?.city,
    teamB?.nickname,
    trade.teamBReceives,
  ].filter(Boolean).join(" ").toLowerCase();
}

export default function TradesExplorer({ trades, playerNameIndex = {} }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const playerNames = useMemo(() => Object.keys(playerNameIndex).sort((a, b) => b.length - a.length), [playerNameIndex]);

  const filteredTrades = useMemo(() => {
    if (!normalizedQuery) return trades;

    const exactTeam = Object.values(teamByAbbreviation).find((team) =>
      [team.abbreviation, team.name, team.city, team.nickname]
        .filter(Boolean)
        .some((value) => value.toLowerCase() === normalizedQuery)
    );

    if (exactTeam) {
      return trades.filter((trade) => trade.teamA === exactTeam.abbreviation || trade.teamB === exactTeam.abbreviation);
    }

    return trades.filter((trade) => searchText(trade).includes(normalizedQuery));
  }, [trades, normalizedQuery]);

  const grouped = useMemo(() => filteredTrades.reduce((groups, trade) => {
    if (!groups[trade.date]) groups[trade.date] = [];
    groups[trade.date].push(trade);
    return groups;
  }, {}), [filteredTrades]);

  return (
    <>
      <div className="mb-9 rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="trade-search" className="sr-only">Search trades by team or player</label>
            <input
              id="trade-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team or player..."
              className="w-full rounded-2xl border border-[#000B36]/12 bg-[#F7F9FC] px-4 py-3.5 text-base font-bold outline-none transition placeholder:text-[#000B36]/30 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
            />
          </div>
          <div className="shrink-0 px-1 text-sm font-black text-[#000B36]/45">
            {filteredTrades.length} {filteredTrades.length === 1 ? "trade" : "trades"}
          </div>
        </div>
        <p className="mt-2 px-1 text-xs font-semibold text-[#000B36]/40">
          Search by team name, abbreviation, city, or any player listed in a trade.
        </p>
      </div>

      {filteredTrades.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white px-6 py-14 text-center">
          <h2 className="text-2xl font-black">No matching trades</h2>
          <p className="mt-2 text-sm font-semibold text-[#000B36]/48">Try another team or player name.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-5 rounded-full bg-[#000B36] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#A90117]"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-10">
          {Object.entries(grouped).map(([date, dateTrades]) => (
            <section key={date}>
              <div className="mb-4 flex items-center gap-4">
                <h2 className="shrink-0 text-xl font-black md:text-2xl">{date}</h2>
                <div className="h-px flex-1 bg-[#000B36]/10" />
                <span className="shrink-0 text-xs font-black uppercase tracking-wide text-[#000B36]/35">{dateTrades.length} {dateTrades.length === 1 ? "trade" : "trades"}</span>
              </div>

              <div className="grid gap-4">
                {dateTrades.map((trade) => (
                  <article key={trade.number} className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
                    <div className="mb-4 flex items-center justify-between gap-4 px-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#000B36]/35">Trade #{trade.number}</span>
                      <span className="rounded-full bg-[#000B36] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white">Official</span>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <TeamSide abbreviation={trade.teamA} receives={trade.teamAReceives} playerNameIndex={playerNameIndex} playerNames={playerNames} />
                      <TeamSide abbreviation={trade.teamB} receives={trade.teamBReceives} playerNameIndex={playerNameIndex} playerNames={playerNames} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
