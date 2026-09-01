"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

function compactMoney(value) {
  const millions = value / 1_000_000;
  return `${value < 0 ? "−" : ""}$${Math.abs(millions).toFixed(Number.isInteger(Math.abs(millions)) ? 0 : 2)}M`;
}

function StatusDot({ passed }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${passed ? "bg-emerald-600" : "bg-[#A90117]"}`} aria-hidden="true" />;
}

function CountCell({ value, required, maximum = false }) {
  const passed = maximum ? value <= required : value >= required;
  return (
    <div className="flex items-center justify-center gap-2 font-black">
      <StatusDot passed={passed} />
      <span>{value}</span>
    </div>
  );
}

const columns = [
  { key: "team", label: "Team", align: "left" },
  { key: "payroll", label: "Payroll", align: "right" },
  { key: "capSpace", label: "Cap space", align: "right" },
  { key: "count", label: "Players", align: "center" },
  { key: "forwardsCount", label: "F", align: "center" },
  { key: "defensemenCount", label: "D", align: "center" },
  { key: "goaliesCount", label: "G", align: "center" },
  { key: "overallSum", label: "Team OVR Sum", align: "center" },
  { key: "status", label: "Status", align: "left" },
];

function sortValue(row, key) {
  if (key === "team") return row.team.abbreviation;
  if (key === "status") return row.roster.compliant ? 0 : 1;
  return row.roster[key];
}

export default function CapComplianceTable({ rows, rosterRules }) {
  const [sort, setSort] = useState({ key: "team", direction: "asc" });

  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = sortValue(a, sort.key);
      const bValue = sortValue(b, sort.key);
      if (typeof aValue === "string" || typeof bValue === "string") {
        return String(aValue).localeCompare(String(bValue)) * direction;
      }
      if (aValue === bValue) return a.team.abbreviation.localeCompare(b.team.abbreviation);
      return (aValue - bValue) * direction;
    });
  }, [rows, sort]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-left">
          <thead className="bg-[#000B36] text-white">
            <tr className="text-[10px] font-black uppercase tracking-[0.14em]">
              {columns.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={`${column.key === "team" || column.key === "status" ? "px-5" : "px-4"} py-2 ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-1.5 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/70 ${column.align === "right" ? "ml-auto" : column.align === "center" ? "mx-auto" : ""}`}
                      aria-label={`Sort by ${column.label}${active ? `, currently ${sort.direction === "asc" ? "ascending" : "descending"}` : ""}`}
                    >
                      <span>{column.label}</span>
                      <span className={`text-[9px] ${active ? "text-cyan-200" : "text-white/35"}`} aria-hidden="true">
                        {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ team, roster }, index) => {
              const payrollPassed = roster.salaryCompliant;
              return (
                <tr key={team.slug} className={`border-t border-[#000B36]/8 ${index % 2 ? "bg-[#FAFBFD]" : "bg-white"}`}>
                  <td className="px-5 py-4">
                    <Link href={`/teams/${team.slug}`} className="flex items-center gap-3 font-black hover:text-[#A90117]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] p-1.5">
                        <Image src={team.logo} alt="" width={40} height={40} className="h-full w-full object-contain" />
                      </span>
                      <span>
                        <span className="block text-sm">{team.name}</span>
                        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.14em] text-[#000B36]/35">{team.abbreviation}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex items-center gap-2 font-black">
                      <StatusDot passed={payrollPassed} />
                      <span>{compactMoney(roster.payroll)}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-4 text-right text-sm font-black ${roster.capSpace < 0 ? "text-[#A90117]" : "text-[#000B36]/65"}`}>
                    {compactMoney(roster.capSpace)}
                  </td>
                  <td className="px-4 py-4 text-center"><CountCell value={roster.count} required={rosterRules.maximumPlayers} maximum /></td>
                  <td className="px-4 py-4 text-center"><CountCell value={roster.forwardsCount} required={rosterRules.minimumForwards} /></td>
                  <td className="px-4 py-4 text-center"><CountCell value={roster.defensemenCount} required={rosterRules.minimumDefensemen} /></td>
                  <td className="px-4 py-4 text-center"><CountCell value={roster.goaliesCount} required={rosterRules.minimumGoalies} /></td>
                  <td className="px-4 py-4 text-center text-sm font-black">{roster.overallSum}</td>
                  <td className="px-5 py-4">
                    {roster.compliant ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-700">Compliant</span>
                    ) : (
                      <div>
                        <span className="inline-flex rounded-full bg-red-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-[#A90117]">Needs action</span>
                        <p className="mt-1.5 max-w-64 text-[11px] font-bold leading-4 text-[#000B36]/45">{roster.issues.join(" · ")}</p>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
