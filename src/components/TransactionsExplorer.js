"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TeamMark from "@/components/TeamMark";
import { teamByAbbreviation } from "../../data/teams";

const categories = [
  ["all", "All"], ["trade", "Trades"], ["signing", "Signings"],
  ["waiver", "Waivers"], ["claim", "Claims"], ["release", "Releases"],
];

const categoryLabels = {
  trade: "Trade", signing: "Signing", waiver: "Waivers",
  claim: "Claim", release: "Release",
};

function currency(value) {
  const amount = Number(value) / 1_000_000;
  return `$${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}M`;
}

function dateLabel(record) {
  if (!record.date) return "Date not recorded";
  const date = new Date(record.date);
  if (Number.isNaN(date.getTime())) return record.date;
  const value = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(date);
  return record.dateKind === "logged" ? `Logged ${value}`
    : record.dateKind === "submitted" ? `Submitted ${value}` : value;
}

function TeamLink({ code }) {
  const team = teamByAbbreviation[code];
  if (!team) return <span className="font-black">{code || "Unknown team"}</span>;
  return (
    <Link href={`/teams/${team.slug}`} className="font-black text-[#000B36] hover:text-[#A90117] hover:underline">
      {team.name}
    </Link>
  );
}

function PlayerLink({ name, playerIndex }) {
  const id = playerIndex[String(name || "").replace(/^(?:F|D|G)\s+/i, "").trim().toLowerCase()];
  return id
    ? <Link className="font-black hover:text-[#A90117] hover:underline" href={`/players/${id}`}>{name}</Link>
    : <span className="font-black">{name}</span>;
}

function TradeCard({ item }) {
  const trade = item.trade;
  const parties = [
    [trade.teamA, trade.teamAReceives],
    [trade.teamB, trade.teamBReceives],
    ...(trade.teamC ? [[trade.teamC, trade.teamCReceives]] : []),
  ];
  return (
    <div>
      <p className="mb-4 text-sm font-black text-[#000B36]/55">
        Trade #{trade.number}{trade.teamC ? " · Three-team trade" : " · Two-team trade"}
      </p>
      <div className={`grid gap-3 ${trade.teamC ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
        {parties.map(([code, receives]) => {
          const team = teamByAbbreviation[code];
          return (
            <div key={code} className="rounded-2xl border border-[#000B36]/10 bg-[#F6F8FC] p-4">
              <div className="flex items-center gap-3">
                {team ? <TeamMark team={team} size="sm" framed={false} /> : null}
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/45">Receives</p>
                  <TeamLink code={code} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6">{receives || "—"}</p>
            </div>
          );
        })}
      </div>
      {trade.salaryRetention && <p className="mt-4 rounded-xl bg-[#F6F8FC] px-4 py-3 text-sm font-semibold">
        <span className="font-black">Salary retention:</span> {trade.salaryRetention}
      </p>}
      <Link href="/trades" className="mt-4 inline-block text-xs font-black uppercase tracking-wide text-[#A90117] hover:underline">
        View detailed trade log →
      </Link>
    </div>
  );
}

function TransactionCard({ item, playerIndex }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-[#000B36] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
          {categoryLabels[item.type]}
        </span>
        <span className="text-xs font-bold text-[#000B36]/45">{dateLabel(item)}</span>
      </div>
      {item.type === "trade" ? <TradeCard item={item} /> : (
        <div className="flex items-start gap-4">
          {teamByAbbreviation[item.type === "claim" ? item.claimedBy : item.team] ? (
            <TeamMark team={teamByAbbreviation[item.type === "claim" ? item.claimedBy : item.team]} size="sm" framed={false} />
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black leading-7 md:text-lg">
              <PlayerLink name={item.player} playerIndex={playerIndex} />
            </h3>
            {item.type === "signing" ? (
              <>
                <p className="mt-1 text-sm font-semibold">Signed with <TeamLink code={item.team} /></p>
                <p className="mt-2 text-sm font-black text-[#000B36]/65">
                  {item.term} {item.term === 1 ? "year" : "years"} · {currency(item.aav)} AAV
                </p>
              </>
            ) : item.type === "waiver" ? (
              <p className="mt-1 text-sm font-semibold">Placed on waivers by <TeamLink code={item.team} />.</p>
            ) : item.type === "claim" ? (
              <p className="mt-1 text-sm font-semibold">
                Claimed by <TeamLink code={item.claimedBy} /> from <TeamLink code={item.team} />.
                Remaining contract transferred.
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold">
                Cleared waivers and was released by <TeamLink code={item.team} />.
                {item.historical ? " Historical clearance — no dead-cap penalty (before Nov 6, 2026)." : " The 25% dead-cap release rule applies."}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function searchText(item) {
  const teams = (item.teams || []).flatMap((code) => {
    const team = teamByAbbreviation[code];
    return [code, team?.name, team?.city, team?.nickname].filter(Boolean);
  });
  return [...teams, item.player, item.type,
    item.trade?.teamAReceives, item.trade?.teamBReceives, item.trade?.teamCReceives,
    item.trade?.salaryRetention].filter(Boolean).join(" ").toLowerCase();
}

export default function TransactionsExplorer({ entries, playerIndex = {} }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => entries.filter((item) =>
    (category === "all" || item.type === category) &&
    (!search.trim() || searchText(item).includes(search.trim().toLowerCase()))
  ), [entries, category, search]);

  return (
    <>
      <div className="mb-7 rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap gap-2">
          {categories.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setCategory(id)}
              aria-pressed={category === id}
              className={`rounded-full px-4 py-2.5 text-xs font-black transition ${category === id
                ? "bg-[#000B36] text-white" : "bg-[#F1F4F8] text-[#000B36]/70 hover:bg-[#E3EAF3]"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="transaction-search">Search transactions</label>
          <input id="transaction-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by player or team..." className="min-w-0 flex-1 rounded-2xl border border-[#000B36]/12 bg-[#F7F9FC] px-4 py-3.5 text-sm font-bold outline-none focus:border-[#18BDFC]" />
          <p className="shrink-0 text-xs font-black text-[#000B36]/45">
            {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
          </p>
        </div>
      </div>
      {filtered.length ? (
        <div className="grid gap-4">
          {filtered.map((item) => <TransactionCard key={item.id} item={item} playerIndex={playerIndex} />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white px-6 py-16 text-center">
          <h2 className="text-xl font-black">No transactions found</h2>
          <p className="mt-2 text-sm font-semibold text-[#000B36]/50">Try another filter or search term.</p>
          <button type="button" onClick={() => { setCategory("all"); setSearch(""); }}
            className="mt-4 rounded-full bg-[#000B36] px-5 py-2 text-sm font-black text-white">
            Reset filters
          </button>
        </div>
      )}
    </>
  );
}
