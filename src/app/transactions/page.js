import Link from "next/link";
import TransactionsExplorer from "@/components/TransactionsExplorer";
import { getTrades } from "@/lib/trades";
import { getPlayers } from "@/lib/players";
import { buildTransactionFeed } from "@/lib/transactionFeed";

export const metadata = {
  title: "Transactions",
  description: "Live AVHL league transaction history: trades, signings, waivers, claims, and releases.",
};

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [tradeResult, playerData] = await Promise.all([getTrades(), getPlayers()]);
  const { records, warning } = await buildTransactionFeed(
    tradeResult.trades, playerData.waiverRecords, playerData.signingRecords,
  );
  const playerIndex = {};
  const ambiguous = new Set();
  for (const player of playerData.players) {
    const name = player.name.toLowerCase();
    if (playerIndex[name] && playerIndex[name] !== player.id) ambiguous.add(name);
    else playerIndex[name] = player.id;
  }
  for (const name of ambiguous) delete playerIndex[name];

  const errors = [tradeResult.error, playerData.waiverError, playerData.signingError, warning].filter(Boolean);
  const totals = {
    trades: records.filter((r) => r.type === "trade").length,
    signings: records.filter((r) => r.type === "signing").length,
    other: records.filter((r) => ["waiver", "claim", "release"].includes(r.type)).length,
  };
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.32),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 League Operations</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Transactions</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            Follow official trades, signings, waiver placements, claims, and releases
            in one league-wide feed, synchronized with the AVHL Trade Tracker.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              [records.length, "Transactions"],
              [totals.trades, "Trades"],
              [totals.signings, "Signings"],
              [totals.other, "Waiver activity"],
            ].map(([number, label]) => (
              <div key={label} className="min-w-32 rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur">
                <p className="text-2xl font-black">{number}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        {errors.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-50 p-5 text-sm font-semibold text-amber-950">
            <p className="font-black">Some transaction data could not be verified.</p>
            {errors.map((error) => <p key={error} className="mt-1">{error}</p>)}
          </div>
        ) : null}
        <TransactionsExplorer entries={records} playerIndex={playerIndex} />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-[#000B36]/50">
          <span>Trades show their official recorded dates. Signings and waivers show when the website first logged them.</span>
          <Link href="/trades" className="font-black text-[#A90117] hover:underline">View full trade details →</Link>
        </div>
      </section>
    </main>
  );
}
