import { teams } from "../../../data/teams";
import { buildTeamRosterAndCap, rosterRules, salaryCapRules } from "../../../data/salaryCap";
import { getPlayers } from "@/lib/players";
import { getCurrentInjuryState } from "@/lib/injuries";
import { getCapContext, teamCapOptions } from "@/lib/capContext";
import CapComplianceTable from "@/components/CapComplianceTable";

export const metadata = {
  title: "Cap Compliance",
  description: "Live 2026–27 AVHL salary-cap and roster compliance for all 40 teams.",
};

export const dynamic = "force-dynamic";

function compactMoney(value) {
  const millions = value / 1_000_000;
  return `${value < 0 ? "−" : ""}$${Math.abs(millions).toFixed(Number.isInteger(Math.abs(millions)) ? 0 : 2)}M`;
}

export default async function CapPage() {
  const playerData = await getPlayers();
  const { players } = playerData;
  const injuryState = await getCurrentInjuryState(players).catch((error) => {
    console.error("Unable to load injuries while calculating salary cap", error);
    return { active: [], recovered: [], scheduleError: "Injury state is unavailable." };
  });
  const context = await getCapContext(players, playerData.waiverRecords, injuryState, playerData.waiverError);
  if (injuryState.scheduleError) context.error = context.error || "Injury schedule data is unavailable.";
  const accountingWarnings = [...(playerData.waiverWarnings || []), ...context.warnings];
  const teamRows = teams
    .map((team) => {
      const roster = buildTeamRosterAndCap(players, team.name, teamCapOptions(team.abbreviation, context));
      return {
        team: {
          slug: team.slug,
          name: team.name,
          abbreviation: team.abbreviation,
          logo: team.assets.logo,
        },
        roster: {
          payroll: roster.payroll,
          capSpace: roster.capSpace,
          count: roster.count,
          forwardsCount: roster.forwardsCount,
          defensemenCount: roster.defensemenCount,
          goaliesCount: roster.goalies.length,
          top20AverageOverall: roster.top20AverageOverall,
          salaryCompliant: roster.salaryCompliant,
          overCap: roster.overCap,
          belowFloor: roster.belowFloor,
          rosterCompliant: roster.rosterCompliant,
          compliant: roster.compliant,
          issues: roster.issues,
        },
      };
    })
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
            Live salary and roster compliance for every AVHL team. The {compactMoney(salaryCapRules.floor)} floor applies before LTIR relief; effective payroll can fall below it due to LTIR and still be compliant. The {compactMoney(salaryCapRules.cap)} ceiling, minimums of {rosterRules.minimumForwards} F, {rosterRules.minimumDefensemen} D, and {rosterRules.minimumGoalies} G, and {rosterRules.maximumPlayers}-player active roster maximum still apply.
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
          <p className="text-xs font-bold text-[#000B36]/45">Click a column heading to sort · Green dot = requirement met · Red dot = action required</p>
        </div>

        {context.error ? (
          <p role="alert" className="mb-5 rounded-2xl border border-[#A90117]/20 bg-red-50 p-4 text-sm font-bold text-[#A90117]">
            Cap calculations are not fully verified: {context.error} The roster-only figures are provisional.
          </p>
        ) : null}
        {accountingWarnings.length ? (
          <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-950">Commissioner accounting checks ({accountingWarnings.length})</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-amber-950/75">
              {accountingWarnings.slice(0, 12).map((warning, index) => <li key={index}>{warning}</li>)}
            </ul>
          </div>
        ) : null}
        <CapComplianceTable rows={teamRows} rosterRules={rosterRules} />

        <p className="mt-5 text-xs font-semibold leading-5 text-[#000B36]/42">
          Salary figures include active roster obligations, retained salary, waiver-release dead cap, and LTIR relief where applicable. The original contract salaries remain unchanged. Top 20 Avg OVR is based on the highest-rated available roster players. Team pages use the same cap accounting.
        </p>
      </section>
    </main>
  );
}
