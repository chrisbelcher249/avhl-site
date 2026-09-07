"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const VIEW_OPTIONS = [
  ["league", "League"],
  ["conference", "Conference"],
  ["division", "Division"],
  ["wildcard", "Wild Card"],
  ["bracket", "Live Bracket"],
];

const DIVISION_META = {
  Pacific: { code: "PCF", label: "Pacific" },
  Central: { code: "CEN", label: "Central" },
  Atlantic: { code: "ATL", label: "Atlantic" },
  Metropolitan: { code: "EAST", label: "East" },
};

function pct(value) {
  return Number(value || 0).toFixed(3);
}

function perGame(value) {
  return Number(value || 0).toFixed(2);
}

function TeamCell({ record, compact = false }) {
  return (
    <Link href={`/teams/${record.team.slug}`} className="flex min-w-0 items-center gap-2.5 font-black transition hover:text-[#A90117]">
      <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] p-1 ${compact ? "h-7 w-7" : "h-9 w-9"}`}>
        <Image src={record.team.assets.logo} alt="" width={36} height={36} className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0">
        <span className={`block truncate ${compact ? "text-[12px]" : "text-sm"}`}>{record.team.name}</span>
        {!compact ? <span className="mt-0.5 block text-[9px] uppercase tracking-[0.13em] text-[#000B36]/32">{record.team.abbreviation}</span> : null}
      </span>
    </Link>
  );
}

function DetailedTable({ records }) {
  const headings = ["#", "Team", "GP", "W", "L", "OTL", "PTS", "PTS%", "RW", "GF/G", "GA/G", "GF", "GA", "GD"];
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#000B36]/10 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-sm">
          <thead className="bg-[#000B36] text-white">
            <tr className="text-[9px] font-black uppercase tracking-[0.12em]">
              {headings.map((heading) => (
                <th key={heading} className={`px-3 py-3.5 ${heading === "Team" ? "text-left" : "text-center"}`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record.team.slug} className="border-t border-[#000B36]/8 bg-white even:bg-[#FAFBFD]">
                <td className="px-3 py-3 text-center text-xs font-black text-[#000B36]/45">{index + 1}</td>
                <td className="min-w-[240px] px-4 py-3"><TeamCell record={record} /></td>
                <td className="px-3 py-3 text-center font-black">{record.gp}</td>
                <td className="px-3 py-3 text-center font-black">{record.wins}</td>
                <td className="px-3 py-3 text-center font-black">{record.losses}</td>
                <td className="px-3 py-3 text-center font-black">{record.otl}</td>
                <td className="px-3 py-3 text-center text-base font-black">{record.pts}</td>
                <td className="px-3 py-3 text-center font-bold">{pct(record.ptsPct)}</td>
                <td className="px-3 py-3 text-center font-black">{record.rw}</td>
                <td className="px-3 py-3 text-center font-bold">{perGame(record.gfPerGame)}</td>
                <td className="px-3 py-3 text-center font-bold">{perGame(record.gaPerGame)}</td>
                <td className="px-3 py-3 text-center font-bold">{record.gf}</td>
                <td className="px-3 py-3 text-center font-bold">{record.ga}</td>
                <td className={`px-3 py-3 text-center font-black ${record.gd > 0 ? "text-emerald-700" : record.gd < 0 ? "text-[#A90117]" : ""}`}>{record.gd > 0 ? `+${record.gd}` : record.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompactTable({ title, eyebrow, records, labelForIndex, accent = false }) {
  return (
    <section className="overflow-hidden rounded-[1.65rem] border border-[#000B36]/10 bg-white shadow-sm">
      <div className={`border-b border-[#000B36]/8 px-4 py-3.5 ${accent ? "bg-[#000B36] text-white" : "bg-[#F5F7FB]"}`}>
        {eyebrow ? <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${accent ? "text-cyan-200" : "text-[#A90117]"}`}>{eyebrow}</p> : null}
        <h3 className="mt-0.5 text-lg font-black">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[11px]">
          <thead className={accent ? "bg-[#000B36] text-white" : "bg-white text-[#000B36]/55"}>
            <tr className="border-b border-[#000B36]/8 text-[8px] font-black uppercase tracking-[0.1em]">
              {["", "Team", "GP", "W", "L", "OTL", "PTS", "PTS%", "RW", "GD"].map((heading, index) => (
                <th key={`${heading}-${index}`} className={`px-2 py-2.5 ${heading === "Team" ? "text-left" : "text-center"}`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={record.team.slug} className="border-t border-[#000B36]/7 bg-white even:bg-[#FAFBFD]">
                <td className="whitespace-nowrap px-2 py-2.5 text-center text-[9px] font-black uppercase tracking-[0.06em] text-[#A90117]">{labelForIndex ? labelForIndex(index, record) : index + 1}</td>
                <td className="max-w-[180px] px-2 py-2.5"><TeamCell record={record} compact /></td>
                <td className="px-2 py-2.5 text-center font-bold">{record.gp}</td>
                <td className="px-2 py-2.5 text-center font-bold">{record.wins}</td>
                <td className="px-2 py-2.5 text-center font-bold">{record.losses}</td>
                <td className="px-2 py-2.5 text-center font-bold">{record.otl}</td>
                <td className="px-2 py-2.5 text-center text-[12px] font-black">{record.pts}</td>
                <td className="px-2 py-2.5 text-center font-bold">{pct(record.ptsPct)}</td>
                <td className="px-2 py-2.5 text-center font-bold">{record.rw}</td>
                <td className={`px-2 py-2.5 text-center font-black ${record.gd > 0 ? "text-emerald-700" : record.gd < 0 ? "text-[#A90117]" : ""}`}>{record.gd > 0 ? `+${record.gd}` : record.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SeedTeam({ record, note }) {
  if (!record) return null;
  return (
    <Link href={`/teams/${record.team.slug}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[#000B36]/10 bg-white px-3 py-2.5 transition hover:border-[#18BDFC]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] p-1">
        <Image src={record.team.assets.logo} alt="" width={32} height={32} className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-black">{record.team.name}</span>
        <span className="mt-0.5 block text-[8px] font-black uppercase tracking-[0.12em] text-[#000B36]/35">{note || `Seed ${record.seed}`}</span>
      </span>
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#000B36] px-2 text-[10px] font-black text-white">{record.seed}</span>
    </Link>
  );
}

function BracketMatchup({ label, top, bottom, placeholder }) {
  return (
    <div className="rounded-3xl border border-[#000B36]/10 bg-[#F7F9FC] p-3.5">
      <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-[#A90117]">{label}</p>
      <SeedTeam record={top} />
      <div className="my-1.5 text-center text-[8px] font-black uppercase tracking-[0.14em] text-[#000B36]/24">vs</div>
      {bottom ? <SeedTeam record={bottom} /> : <div className="rounded-2xl border border-dashed border-[#000B36]/15 bg-white px-3 py-3 text-center text-[10px] font-black text-[#000B36]/42">{placeholder}</div>}
    </div>
  );
}

function ConferenceBracket({ data }) {
  const seed = (number) => data.seeds.find((record) => record.seed === number);
  return (
    <section className="rounded-[2rem] border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-end justify-between gap-4 border-b border-[#000B36]/8 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">If the season ended today</p>
          <h3 className="mt-1 text-2xl font-black">{data.conference} Conference</h3>
        </div>
        <span className="rounded-full bg-[#000B36] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">10-team field</span>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-1 rounded-2xl bg-[#000B36] p-2 text-center text-white sm:gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => {
          const record = seed(number);
          return (
            <div key={number} className="min-w-0 rounded-xl bg-white/[0.07] px-1.5 py-2">
              <p className="text-[8px] font-black text-cyan-200">#{number}</p>
              <p className="mt-0.5 truncate text-[8px] font-black sm:text-[9px]">{record?.team.abbreviation || "—"}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/40">Qualifier round</p>
          <div className="space-y-3">
            <BracketMatchup label="8 vs 9" top={seed(8)} bottom={seed(9)} />
            <BracketMatchup label="7 vs 10" top={seed(7)} bottom={seed(10)} />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/40">Round 1 projection</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <BracketMatchup label="1 seed" top={seed(1)} placeholder="Winner of 8 / 9" />
            <BracketMatchup label="4 vs 5" top={seed(4)} bottom={seed(5)} />
            <BracketMatchup label="2 seed" top={seed(2)} placeholder="Winner of 7 / 10" />
            <BracketMatchup label="3 vs 6" top={seed(3)} bottom={seed(6)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function LeagueView({ league }) {
  return (
    <div>
      <ViewHeading eyebrow="All 40 clubs" title="League standings" detail="One table, ranked 1–40 using the official AVHL tiebreaker sequence." />
      <DetailedTable records={league} />
    </div>
  );
}

function ConferenceView({ conferences }) {
  return (
    <div>
      <ViewHeading eyebrow="Two conferences" title="Conference standings" detail="All 20 teams in each conference, ranked without regard to divisional playoff position." />
      <div className="grid gap-6 xl:grid-cols-2">
        {conferences.map((conference) => (
          <CompactTable key={conference.conference} title={`${conference.conference} Conference`} eyebrow="Conference table" records={conference.conferenceRecords} />
        ))}
      </div>
    </div>
  );
}

function DivisionView({ conferences }) {
  const divisions = conferences.flatMap((conference) => conference.divisionSections);
  return (
    <div>
      <ViewHeading eyebrow="Four divisions" title="Division standings" detail="Every division is shown in full. PCF is the official abbreviation for the Pacific Division." />
      <div className="grid gap-6 xl:grid-cols-2">
        {divisions.map((division) => {
          const meta = DIVISION_META[division.name];
          return (
            <CompactTable
              key={division.name}
              title={`${meta.code} · ${meta.label} Division`}
              eyebrow="Division table"
              records={division.records}
            />
          );
        })}
      </div>
    </div>
  );
}

function WildCardView({ conferences }) {
  return (
    <div>
      <ViewHeading eyebrow="Playoff race" title="Wild card standings" detail="Each conference shows its top three teams from both divisions plus the four current wild cards." />
      <div className="grid gap-7 xl:grid-cols-2">
        {conferences.map((conference) => (
          <section key={conference.conference} className="rounded-[2rem] border border-[#000B36]/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Current playoff field</p>
                <h3 className="mt-1 text-3xl font-black">{conference.conference}</h3>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/35">6 division spots + 4 WC</p>
            </div>
            <div className="space-y-4">
              {conference.divisionSections.map((division) => {
                const meta = DIVISION_META[division.name];
                return (
                  <CompactTable
                    key={division.name}
                    title={`${meta.code} · Top 3`}
                    records={division.topThree}
                    labelForIndex={(index) => `${meta.code} ${index + 1}`}
                  />
                );
              })}
              <CompactTable
                title="Wild Cards"
                eyebrow="Remaining conference teams"
                records={conference.wildCards}
                labelForIndex={(index) => `WC ${index + 1}`}
                accent
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function BracketView({ conferences, completedGames }) {
  return (
    <div>
      <ViewHeading eyebrow="Projected postseason" title="Live bracket" detail="Division winners are seeds 1–2, second-place teams 3–4, third-place teams 5–6, and wild cards 7–10." />
      {completedGames > 0 ? (
        <div className="grid gap-7 xl:grid-cols-2">
          {conferences.map((conference) => <ConferenceBracket key={conference.conference} data={conference} />)}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-[#000B36]/18 bg-white p-10 text-center">
          <p className="text-2xl font-black">The live bracket activates after the first completed game.</p>
          <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#000B36]/45">Once results begin coming in, both conference fields and all seeds 1–10 will populate automatically from the live standings.</p>
        </div>
      )}
    </div>
  );
}

function ViewHeading({ eyebrow, title, detail }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A90117]">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{title}</h2>
      </div>
      <p className="max-w-2xl text-sm font-semibold leading-6 text-[#000B36]/45">{detail}</p>
    </div>
  );
}

export default function StandingsViews({ league, conferences, completedGames }) {
  const [view, setView] = useState("league");

  return (
    <>
      <div className="mb-9 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-max rounded-full border border-[#000B36]/10 bg-white p-1.5 shadow-sm">
            {VIEW_OPTIONS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`rounded-full px-5 py-2.5 text-xs font-black transition sm:px-6 ${view === id ? "bg-[#000B36] text-white shadow-sm" : "text-[#000B36]/55 hover:bg-[#F3F6FA] hover:text-[#000B36]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Link href="/standings/tiebreakers" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#000B36]/12 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.13em] text-[#000B36] shadow-sm transition hover:border-[#A90117]/35 hover:text-[#A90117]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A90117] text-[9px] text-white">7</span>
          Tiebreakers
        </Link>
      </div>

      {view === "league" ? <LeagueView league={league} /> : null}
      {view === "conference" ? <ConferenceView conferences={conferences} /> : null}
      {view === "division" ? <DivisionView conferences={conferences} /> : null}
      {view === "wildcard" ? <WildCardView conferences={conferences} /> : null}
      {view === "bracket" ? <BracketView conferences={conferences} completedGames={completedGames} /> : null}
    </>
  );
}
