import { rosterRules, salaryCapRules } from "../../data/salaryCap";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(value) {
  return currency.format(value);
}

function compactMoney(value) {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  return `$${Math.round(value / 1_000)}K`;
}

function Check({ passed, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#000B36]/10 bg-white p-4">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${passed ? "bg-emerald-600" : "bg-[#A90117]"}`}>
        {passed ? "✓" : "×"}
      </span>
      <p className="pt-0.5 text-sm font-bold leading-5">{children}</p>
    </div>
  );
}

export default function SalaryCapSection({ roster, primary }) {
  const statusColor = roster.compliant ? "#087A4A" : "#A90117";
  const payrollWidth = Math.max(0, Math.min(100, (roster.payroll / salaryCapRules.cap) * 100));
  const capSpaceText = roster.capSpace >= 0
    ? `${formatMoney(roster.capSpace)} available`
    : `${formatMoney(Math.abs(roster.capSpace))} over cap`;
  const floorText = roster.floorPosition >= 0
    ? `${formatMoney(roster.floorPosition)} above floor`
    : `${formatMoney(Math.abs(roster.floorPosition))} below floor`;

  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8 md:pb-20">
      <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
        <div className="grid gap-6 bg-[#000B36] p-6 text-white md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">2026–27 roster rules</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Roster & cap compliance</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/55">
              A team must satisfy the salary rules and carry at least {rosterRules.minimumForwards} forwards, {rosterRules.minimumDefensemen} defensemen, and {rosterRules.minimumGoalies} goalies while carrying between {rosterRules.minimumPlayers} and {rosterRules.maximumPlayers} total players.
            </p>
          </div>
          <div className="w-fit rounded-full px-5 py-3 text-sm font-black uppercase tracking-wide text-white" style={{ backgroundColor: statusColor }}>
            {roster.status}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Current payroll", formatMoney(roster.payroll)],
              ["Cap position", capSpaceText],
              ["Floor position", floorText],
              ["Active roster", `${roster.count} players`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#000B36]/10 bg-[#F6F8FC] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">{label}</p>
                <p className="mt-2 text-xl font-black leading-tight">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-[#000B36]/10 p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/40">Payroll range</p>
                <p className="mt-1 text-2xl font-black">{compactMoney(roster.payroll)}</p>
              </div>
              <p className="text-xs font-bold text-[#000B36]/45">Floor {compactMoney(salaryCapRules.floor)} · Cap {compactMoney(salaryCapRules.cap)}</p>
            </div>
            <div className="relative mt-5 h-4 overflow-visible rounded-full bg-[#E9EDF4]">
              <div className="h-4 rounded-full" style={{ width: `${payrollWidth}%`, backgroundColor: roster.salaryCompliant ? primary : statusColor }} />
              <span className="absolute top-[-5px] h-6 w-0.5 bg-[#000B36]" style={{ left: `${(salaryCapRules.floor / salaryCapRules.cap) * 100}%` }} aria-hidden="true" />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-wide text-[#000B36]/38">
              <span>$0</span>
              <span>{compactMoney(salaryCapRules.floor)} floor</span>
              <span>{compactMoney(salaryCapRules.cap)} cap</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Check passed={!roster.overCap}>Payroll is at or below the {formatMoney(salaryCapRules.cap)} salary cap.</Check>
            <Check passed={!roster.belowFloor}>Payroll meets the {formatMoney(salaryCapRules.floor)} salary floor.</Check>
            <Check passed={roster.contractsCompliant}>Every salary is between {formatMoney(salaryCapRules.minimumSalary)} and {formatMoney(salaryCapRules.maximumSalary)}.</Check>
            <Check passed={roster.rosterSizeCompliant}>Roster has between {rosterRules.minimumPlayers} and {rosterRules.maximumPlayers} total players.</Check>
            <Check passed={roster.forwardsCompliant}>At least {rosterRules.minimumForwards} forwards ({roster.forwardsCount} currently).</Check>
            <Check passed={roster.defensemenCompliant}>At least {rosterRules.minimumDefensemen} defensemen ({roster.defensemenCount} currently).</Check>
            <Check passed={roster.goaliesCompliant}>At least {rosterRules.minimumGoalies} goalies ({roster.goalies.length} currently).</Check>
          </div>

          <p className="mt-5 text-xs font-bold text-[#000B36]/40">
            Current roster: {roster.forwardsCount} F · {roster.defensemenCount} D · {roster.goalies.length} G · {roster.count} total
          </p>
        </div>
      </div>
    </section>
  );
}
