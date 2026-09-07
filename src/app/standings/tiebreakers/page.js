import Link from "next/link";

export const metadata = {
  title: "Standings Tiebreakers",
  description: "Official 2026–27 AVHL standings tiebreaker order.",
};

const rules = [
  ["PTS", "Points", "Higher total ranks first"],
  ["PTS%", "Points percentage", "Higher percentage ranks first"],
  ["RW", "Regulation wins", "More regulation wins ranks first"],
  ["W", "Total wins", "More total wins ranks first"],
  ["GF/G", "Goals for per game", "Higher scoring rate ranks first"],
  ["GA/G", "Goals against per game", "Lower goals-against rate ranks first"],
  ["GD", "Goal differential", "Higher goal differential ranks first"],
];

export default function StandingsTiebreakersPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.22),transparent_30%),radial-gradient(circle_at_8%_95%,rgba(169,1,23,0.28),transparent_34%)]" />
        <div className="relative mx-auto max-w-5xl">
          <Link href="/standings" className="text-sm font-black text-white/55 transition hover:text-white">← Standings</Link>
          <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-cyan-200">2026–27 Major League</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Standings tiebreakers</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/60 md:text-lg">
            When two or more clubs are tied, the categories below are applied in order until the tie is broken. The same sequence controls league, conference, division, wild-card, and live-bracket ordering.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8 md:py-14">
        <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-sm">
          <div className="bg-[#000B36] px-5 py-4 text-white sm:px-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Official sequence</p>
            <h2 className="mt-1 text-2xl font-black">Apply from 1 through 7</h2>
          </div>
          <div className="divide-y divide-[#000B36]/8">
            {rules.map(([code, label, explanation], index) => (
              <div key={code} className="grid gap-3 px-5 py-5 sm:grid-cols-[52px_90px_1fr] sm:items-center sm:px-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#000B36] text-sm font-black text-white">{index + 1}</span>
                <span className="text-sm font-black text-[#A90117]">{code}</span>
                <div>
                  <p className="text-base font-black">{label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#000B36]/45">{explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-[#000B36]/10 bg-white p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Live bracket note</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#000B36]/55">
            Playoff seed tiers are set before these comparisons: division winners occupy seeds 1–2, second-place teams 3–4, third-place teams 5–6, and the four wild cards 7–10. These tiebreakers determine the order inside each tier.
          </p>
        </div>
      </section>
    </main>
  );
}
