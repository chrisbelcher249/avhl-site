import PlayersExplorer from "@/components/PlayersExplorer";
import { getPlayers } from "@/lib/players";

export const metadata = {
  title: "Players",
  description: "Search all players in the 2026–27 AVHL database, including rostered players and unrestricted free agents.",
};

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const { players, playerCounts } = await getPlayers();

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_80%_15%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_12%_90%,rgba(169,1,23,0.3),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 Database</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Players</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            Search every player in the AVHL universe, compare ratings and production, or isolate the complete unrestricted free-agent pool.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              [playerCounts.total, "Total players"],
              [playerCounts.rostered, "Rostered"],
              [playerCounts.ufa, "UFAs"],
              [playerCounts.goalies, "Goalies"],
            ].map(([value, label]) => (
              <div key={label} className="min-w-32 rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur">
                <p className="text-2xl font-black">{value.toLocaleString()}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        <PlayersExplorer players={players} playerCounts={playerCounts} />
      </section>
    </main>
  );
}
