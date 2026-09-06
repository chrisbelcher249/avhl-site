import DraftBoardExplorer from "@/components/DraftBoardExplorer";
import { getAllDraftPicks } from "@/lib/draftPicks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Draft Capital",
  description: "Live 2027 and 2028 AVHL draft-pick ownership, current team portfolios, traded picks, and league draft capital.",
};

export default async function DraftPage() {
  const { picks, error } = await getAllDraftPicks();

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_84%_18%,rgba(24,189,252,0.28),transparent_30%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.38),transparent_35%)]" />
        <div className="absolute -right-20 top-4 h-64 w-64 rotate-12 rounded-[3rem] border border-white/5 bg-white/[0.03]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Future Assets</p>
              <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Draft Capital</h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/62 md:text-lg">
                The live AVHL draft board for 2027 and 2028. See every club&apos;s current pick inventory, which assets have changed hands, and where the league&apos;s future capital sits right now.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:w-[330px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Draft years</p>
                <p className="mt-1 text-2xl font-black">2027 · 2028</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Rounds</p>
                <p className="mt-1 text-2xl font-black">1 · 2 · 3</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-12">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">League Draft Board</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Current pick ownership</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#000B36]/48 md:text-base">
            Each team card shows the picks it owns today. A pick marked “via” originated with another club; ownership history is shown directly on traded assets.
          </p>
        </div>

        {error ? (
          <div className="rounded-[2rem] border border-[#A90117]/15 bg-white p-8 shadow-sm">
            <p className="text-lg font-black text-[#A90117]">Draft capital feed temporarily unavailable</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#000B36]/50">{error}</p>
          </div>
        ) : (
          <DraftBoardExplorer picks={picks} />
        )}
      </section>
    </main>
  );
}
