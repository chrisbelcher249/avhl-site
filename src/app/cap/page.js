import { teams } from "../../../data/teams";
import { buildTeamRosterAndCap, rosterRules, salaryCapRules } from "../../../data/salaryCap";
import { getPlayers } from "@/lib/players";
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
  const { players } = await getPlayers();
  const teamRows = teams
    .map((team) => {
      const roster = buildTeamRosterAndCap(players, team.name);
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
          <p className="text-xs font-bold text-[#000B36]/45">Click a column heading to sort · Green dot = requirement met · Red dot = action required</p>
        </div>

        <CapComplianceTable rows={teamRows} rosterRules={rosterRules} />

        <p className="mt-5 text-xs font-semibold leading-5 text-[#000B36]/42">
          Salary figures, roster counts, and Top 20 Avg OVR are calculated from the live AVHL player database. Top 20 Avg OVR is the average OVR of a team’s 20 highest-rated players, or the full roster when a team has fewer than 20 players. Team pages use the same live source.
        </p>
      </section>
    </main>
  );
}
