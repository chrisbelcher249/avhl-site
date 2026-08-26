import Image from "next/image";
import Link from "next/link";
import { teams } from "../../../data/teams";
import { buildTeamRosterAndCap, rosterRules, salaryCapRules } from "../../../data/salaryCap";
import { getPlayers } from "@/lib/players";

export const metadata = {
  title: "Cap Compliance",
  description: "Live 2026–27 AVHL salary-cap and roster compliance for all 40 teams.",
};

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

export default async function CapPage() {
  const { players } = await getPlayers();
  const teamRows = teams
    .map((team) => ({ team, roster: buildTeamRosterAndCap(players, team.name) }))
    .sort((a, b) => a.team.abbreviation.localeCompare(b.team.abbreviation));

  const summary = {
    compliant: teamRows.filter(({ roster }) => roster.compliant).length,
    overCap: teamRows.filter(({ roster }) => roster.overCap).length,
    belowFloor: teamRows.filter(({ roster }) => roster.belowFloor).length,
    rosterIssues: teamRows.filter(({ roster }) => !roster.rosterCompliant).length,
  };

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 League Operations</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Cap Compliance</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            Live salary and roster compliance for every AVHL team. A compliant roster must remain between {compactMoney(salaryCapRules.floor)} and {compactMoney(salaryCapRules.cap)}, carry at least {rosterRules.minimumForwards} F, {rosterRules.minimumDefensemen} D, and {rosterRules.minimumGoalies} G, and contain no more than {rosterRules.maximumPlayers} players.
          </p>
          <div className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [summary.compliant, "Fully compliant"],
              [summary.overCap, "Over cap"],
              [summary.belowFloor, "Below floor"],
              [summary.rosterIssues, "Roster issues"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur">
                <p className="text-3xl font-black">{value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-8 md:py-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">All 40 teams</p>
            <h2 className="mt-1 text-3xl font-black">Current compliance</h2>
          </div>
          <p className="text-xs font-bold text-[#000B36]/45">Green dot = requirement met · Red dot = action required</p>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full border-collapse text-left">
              <thead className="bg-[#000B36] text-white">
                <tr className="text-[10px] font-black uppercase tracking-[0.14em]">
                  <th className="px-5 py-4">Team</th>
                  <th className="px-4 py-4 text-right">Payroll</th>
                  <th className="px-4 py-4 text-right">Cap space</th>
                  <th className="px-4 py-4 text-center">Players</th>
                  <th className="px-4 py-4 text-center">F</th>
                  <th className="px-4 py-4 text-center">D</th>
                  <th className="px-4 py-4 text-center">G</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map(({ team, roster }, index) => {
                  const payrollPassed = roster.salaryCompliant;
                  return (
                    <tr key={team.slug} className={`border-t border-[#000B36]/8 ${index % 2 ? "bg-[#FAFBFD]" : "bg-white"}`}>
                      <td className="px-5 py-4">
                        <Link href={`/teams/${team.slug}`} className="flex items-center gap-3 font-black hover:text-[#A90117]">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] p-1.5">
                            <Image src={team.assets.logo} alt="" width={40} height={40} className="h-full w-full object-contain" />
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
                      <td className="px-4 py-4 text-center"><CountCell value={roster.goalies.length} required={rosterRules.minimumGoalies} /></td>
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

        <p className="mt-5 text-xs font-semibold leading-5 text-[#000B36]/42">
          Salary figures and roster counts are calculated from the live AVHL player database. Team pages use the same compliance rules and update from the same source.
        </p>
      </section>
    </main>
  );
}
