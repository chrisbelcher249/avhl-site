import Link from "next/link";
import TeamMark from "@/components/TeamMark";
import { getTrades, teamByAbbreviation } from "@/lib/trades";

export const metadata = {
  title: "Trades",
  description: "The live 2026–27 AVHL trade log.",
};

export const dynamic = "force-dynamic";

function assetsList(value) {
  return String(value || "").split(",").map((asset) => asset.trim()).filter(Boolean);
}

function TeamSide({ abbreviation, receives }) {
  const team = teamByAbbreviation[abbreviation];
  const assets = assetsList(receives);

  return (
    <div className="min-w-0 rounded-2xl border border-[#000B36]/8 bg-[#F7F9FC] p-4 md:p-5">
      <div className="flex items-center gap-3">
        {team ? <TeamMark team={team} size="sm" framed={false} /> : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#000B36] text-sm font-black text-white">{abbreviation}</div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/35">Receives</p>
          {team ? (
            <Link href={`/teams/${team.slug}`} className="mt-1 block truncate text-base font-black hover:text-[#A90117] md:text-lg">{team.name}</Link>
          ) : (
            <p className="mt-1 text-base font-black md:text-lg">{abbreviation}</p>
          )}
        </div>
      </div>
      <ul className="mt-4 grid gap-2">
        {assets.map((asset) => (
          <li key={asset} className="rounded-xl border border-[#000B36]/8 bg-white px-3 py-2.5 text-sm font-extrabold leading-5">{asset}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function TradesPage() {
  const { trades, error } = await getTrades();
  const grouped = trades.reduce((groups, trade) => {
    if (!groups[trade.date]) groups[trade.date] = [];
    groups[trade.date].push(trade);
    return groups;
  }, {});

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 Transactions</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Trades</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            The official AVHL trade log, synced directly from the league trade tracker. New approved trades appear here automatically when the sheet is updated.
          </p>
          <div className="mt-8 inline-flex rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur">
            <div>
              <p className="text-2xl font-black">{trades.length}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Trades logged</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-14">
        {error ? (
          <div className="rounded-3xl border border-[#A90117]/20 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#A90117]">Live feed unavailable</p>
            <h2 className="mt-2 text-2xl font-black">The trade sheet could not be loaded.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#000B36]/55">{error}</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#000B36]/20 bg-white px-6 py-14 text-center">
            <h2 className="text-2xl font-black">No trades listed</h2>
            <p className="mt-2 text-sm font-semibold text-[#000B36]/48">Approved trades will appear here as they are added to the league tracker.</p>
          </div>
        ) : (
          <div className="grid gap-10">
            {Object.entries(grouped).map(([date, dateTrades]) => (
              <section key={date}>
                <div className="mb-4 flex items-center gap-4">
                  <h2 className="shrink-0 text-xl font-black md:text-2xl">{date}</h2>
                  <div className="h-px flex-1 bg-[#000B36]/10" />
                  <span className="shrink-0 text-xs font-black uppercase tracking-wide text-[#000B36]/35">{dateTrades.length} {dateTrades.length === 1 ? "trade" : "trades"}</span>
                </div>

                <div className="grid gap-4">
                  {dateTrades.map((trade) => (
                    <article key={trade.number} className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm md:p-5">
                      <div className="mb-4 flex items-center justify-between gap-4 px-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#000B36]/35">Trade #{trade.number}</span>
                        <span className="rounded-full bg-[#000B36] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-white">Official</span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <TeamSide abbreviation={trade.teamA} receives={trade.teamAReceives} />
                        <TeamSide abbreviation={trade.teamB} receives={trade.teamBReceives} />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
