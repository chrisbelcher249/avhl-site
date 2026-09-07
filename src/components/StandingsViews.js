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
  Metropolitan: { code: "MET", label: "Metropolitan" },
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

const LIVE_BOARD_WIDTH = 1180;
const LIVE_BOARD_HEIGHT = 580;
const LIVE_NODE = 44;

const LIVE_X = {
  west: { qualifier: 82, round1: 228, round2: 382, conference: 510 },
  east: { qualifier: 1098, round1: 952, round2: 798, conference: 670 },
};

const LIVE_Y = {
  qualifier: [[98, 144], [390, 436]],
  round1: [[70, 116], [205, 251], [350, 396], [485, 531]],
  round2: [[140, 186], [400, 446]],
  conference: [[270, 316]],
  final: [[270, 316]],
};

function liveSeed(data, number) {
  return data?.seeds?.find((record) => record.seed === number) || null;
}

function LiveLogoNode({ record, seed, x, y, side, placeholder }) {
  const actualSeed = seed ?? record?.seed;
  const content = (
    <div
      className={`absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 ${side === "east" ? "flex-row-reverse" : ""}`}
      style={{ left: x, top: y }}
      title={record ? `#${actualSeed} ${record.team.name}` : placeholder || "Projected winner"}
    >
      <span className="text-[9px] font-black tabular-nums text-[#000B36]/45">{record ? `#${actualSeed}` : ""}</span>
      {record ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#000B36]/10 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:border-[#18BDFC] hover:shadow-md">
          <Image src={record.team.assets.logo} alt={record.team.name} width={40} height={40} className="h-full w-full object-contain" />
        </span>
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[#000B36]/16 bg-white/80 text-[8px] font-black uppercase tracking-[0.08em] text-[#000B36]/26">
          {placeholder || "W"}
        </span>
      )}
    </div>
  );

  if (!record) return content;
  return (
    <Link href={`/teams/${record.team.slug}`} className="contents">
      {content}
    </Link>
  );
}

function branchPath(x, y1, y2, targetX, targetY, direction) {
  const nodeEdge = direction === "right" ? x + LIVE_NODE / 2 : x - LIVE_NODE / 2;
  const targetEdge = direction === "right" ? targetX - 20 : targetX + 20;
  const branchX = nodeEdge + (direction === "right" ? 42 : -42);
  const midX = (branchX + targetEdge) / 2;
  return `M ${nodeEdge} ${y1} H ${branchX} V ${y2} H ${nodeEdge} M ${branchX} ${(y1 + y2) / 2} H ${midX} V ${targetY} H ${targetEdge}`;
}

function LiveBracketLines() {
  const paths = [];

  for (const side of ["west", "east"]) {
    const direction = side === "west" ? "right" : "left";
    const x = LIVE_X[side];

    // Qualifiers feed the open Round 1 slots.
    paths.push(branchPath(x.qualifier, ...LIVE_Y.qualifier[0], x.round1, LIVE_Y.round1[0][1], direction));
    paths.push(branchPath(x.qualifier, ...LIVE_Y.qualifier[1], x.round1, LIVE_Y.round1[2][1], direction));

    // Round 1 games feed the two Round 2 series.
    paths.push(branchPath(x.round1, ...LIVE_Y.round1[0], x.round2, LIVE_Y.round2[0][0], direction));
    paths.push(branchPath(x.round1, ...LIVE_Y.round1[1], x.round2, LIVE_Y.round2[0][1], direction));
    paths.push(branchPath(x.round1, ...LIVE_Y.round1[2], x.round2, LIVE_Y.round2[1][0], direction));
    paths.push(branchPath(x.round1, ...LIVE_Y.round1[3], x.round2, LIVE_Y.round2[1][1], direction));

    // Round 2 feeds the Conference Final.
    paths.push(branchPath(x.round2, ...LIVE_Y.round2[0], x.conference, LIVE_Y.conference[0][0], direction));
    paths.push(branchPath(x.round2, ...LIVE_Y.round2[1], x.conference, LIVE_Y.conference[0][1], direction));

    // Conference champion advances into the league final.
    paths.push(branchPath(x.conference, ...LIVE_Y.conference[0], 590, side === "west" ? LIVE_Y.final[0][0] : LIVE_Y.final[0][1], direction));
  }

  // The league-final pairing resolves into the champion marker below.
  paths.push(`M 610 ${LIVE_Y.final[0][0]} H 630 V ${LIVE_Y.final[0][1]} H 610 M 630 293 V 352 H 610`);

  return (
    <svg className="pointer-events-none absolute inset-0 z-0" width={LIVE_BOARD_WIDTH} height={LIVE_BOARD_HEIGHT} viewBox={`0 0 ${LIVE_BOARD_WIDTH} ${LIVE_BOARD_HEIGHT}`} aria-hidden="true">
      {paths.map((d, index) => (
        <path key={index} d={d} fill="none" stroke="rgba(0,11,54,0.22)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function RoundLabel({ x, children }) {
  return (
    <div className="absolute top-4 z-10 -translate-x-1/2 text-center" style={{ left: x }}>
      <p className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">{children}</p>
    </div>
  );
}

function LiveBracketSide({ data, side }) {
  const x = LIVE_X[side];
  const s = (number) => liveSeed(data, number);

  return (
    <>
      <div className="absolute top-10 z-10 -translate-x-1/2 text-center" style={{ left: x.qualifier }}>
        <p className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.16em] text-[#A90117]">{data.conference} Conference</p>
      </div>

      <RoundLabel x={x.qualifier}>Qualifier</RoundLabel>
      <RoundLabel x={x.round1}>Round 1</RoundLabel>
      <RoundLabel x={x.round2}>Round 2</RoundLabel>
      <RoundLabel x={x.conference}>Conf. Final</RoundLabel>

      <LiveLogoNode record={s(8)} x={x.qualifier} y={LIVE_Y.qualifier[0][0]} side={side} />
      <LiveLogoNode record={s(9)} x={x.qualifier} y={LIVE_Y.qualifier[0][1]} side={side} />
      <LiveLogoNode record={s(7)} x={x.qualifier} y={LIVE_Y.qualifier[1][0]} side={side} />
      <LiveLogoNode record={s(10)} x={x.qualifier} y={LIVE_Y.qualifier[1][1]} side={side} />

      <LiveLogoNode record={s(1)} x={x.round1} y={LIVE_Y.round1[0][0]} side={side} />
      <LiveLogoNode x={x.round1} y={LIVE_Y.round1[0][1]} side={side} placeholder="8/9" />
      <LiveLogoNode record={s(4)} x={x.round1} y={LIVE_Y.round1[1][0]} side={side} />
      <LiveLogoNode record={s(5)} x={x.round1} y={LIVE_Y.round1[1][1]} side={side} />
      <LiveLogoNode record={s(2)} x={x.round1} y={LIVE_Y.round1[2][0]} side={side} />
      <LiveLogoNode x={x.round1} y={LIVE_Y.round1[2][1]} side={side} placeholder="7/10" />
      <LiveLogoNode record={s(3)} x={x.round1} y={LIVE_Y.round1[3][0]} side={side} />
      <LiveLogoNode record={s(6)} x={x.round1} y={LIVE_Y.round1[3][1]} side={side} />

      {LIVE_Y.round2.flat().map((y, index) => <LiveLogoNode key={`r2-${side}-${index}`} x={x.round2} y={y} side={side} placeholder="W" />)}
      {LIVE_Y.conference[0].map((y, index) => <LiveLogoNode key={`cf-${side}-${index}`} x={x.conference} y={y} side={side} placeholder="W" />)}
    </>
  );
}

function LiveBracketBoard({ conferences }) {
  const west = conferences.find((item) => item.conference === "Western") || conferences[0];
  const east = conferences.find((item) => item.conference === "Eastern") || conferences[1];

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
      <div className="relative mx-auto max-w-full" style={{ width: LIVE_BOARD_WIDTH, height: LIVE_BOARD_HEIGHT }}>
        <div className="absolute left-1/2 top-10 z-10 -translate-x-1/2 text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#A90117]">2026–27 projected playoffs</p>
          <p className="mt-0.5 text-lg font-black">League Final</p>
        </div>
        <LiveBracketLines />
        <LiveBracketSide data={west} side="west" />
        <LiveBracketSide data={east} side="east" />

        <LiveLogoNode x={590} y={LIVE_Y.final[0][0]} side="west" placeholder="W" />
        <LiveLogoNode x={590} y={LIVE_Y.final[0][1]} side="east" placeholder="E" />
        <div className="absolute left-1/2 top-[365px] z-20 -translate-x-1/2 rounded-full bg-[#000B36] px-4 py-2 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-200">
          Champion
        </div>
      </div>
    </div>
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
      <ViewHeading eyebrow="Four divisions" title="Division standings" detail="Every division is shown in full. PCF is Pacific and MET is Metropolitan; Eastern refers only to the conference." />
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
      <ViewHeading eyebrow="Playoff race" title="Wild card standings" detail="Each conference shows its six automatic divisional spots, four current wild cards, and the 10 teams outside the projected field." />
      <div className="grid gap-7 xl:grid-cols-2">
        {conferences.map((conference) => (
          <section key={conference.conference} className="rounded-[2rem] border border-[#000B36]/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Current playoff field</p>
                <h3 className="mt-1 text-3xl font-black">{conference.conference} Conference</h3>
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
              <CompactTable
                title="Outside Looking In"
                eyebrow="Next in the conference race"
                records={conference.outside}
                labelForIndex={(index) => index + 11}
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
      <ViewHeading eyebrow="Projected postseason" title="Live bracket" detail="One connected playoff bracket. Division winners seed 1–2, second-place teams 3–4, third-place teams 5–6, and wild cards 7–10." />
      {completedGames === 0 ? (
        <div className="mb-5 rounded-2xl border border-[#18BDFC]/25 bg-cyan-50 px-4 py-3 text-xs font-bold leading-5 text-[#000B36]/65">
          Preseason preview: all clubs are tied at 0–0–0, so the current 1–10 seeds are shown only to preview the bracket format. The bracket will reseed automatically from live standings once games are played.
        </div>
      ) : null}
      <LiveBracketBoard conferences={conferences} />
      <p className="mt-3 text-xs font-semibold leading-5 text-[#000B36]/38">
        Team logos are clickable. Small numbers beside each logo are the current projected conference seeds; outlined nodes represent future series winners.
      </p>
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
