import TradesExplorer from "@/components/TradesExplorer";
import { getTrades } from "@/lib/trades";
import { getPlayerNameIndex } from "@/lib/playerHistory";
import { getPlayers } from "@/lib/players";

export const metadata = {
  title: "Trades",
  description: "The live 2026–27 AVHL trade log.",
};

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const [{ trades, error }, { players }] = await Promise.all([getTrades(), getPlayers()]);
  const playerNameIndex = getPlayerNameIndex();
  for (const player of players) playerNameIndex[player.name.toLowerCase()] = player.id;

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
          <TradesExplorer trades={trades} playerNameIndex={playerNameIndex} />
        )}
      </section>
    </main>
  );
}
