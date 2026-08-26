import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#000724] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <p className="text-xl font-black">American Virtual Hockey League</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
            A custom hockey universe built around franchise identity, long-term history, promotion and relegation, and season-by-season storytelling.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-white/60">
          <Link href="/teams" className="hover:text-cyan-200">Teams</Link>
          <Link href="/players" className="hover:text-cyan-200">Players</Link>
          <Link href="/cap" className="hover:text-cyan-200">Cap</Link>
          <Link href="/trades" className="hover:text-cyan-200">Trades</Link>
          <Link href="/schedule" className="hover:text-cyan-200">Schedule</Link>
          <Link href="/history" className="hover:text-cyan-200">History</Link>
          <Link href="/info" className="hover:text-cyan-200">League Info</Link>
          <a href="https://discord.com/invite/ZTqfdqwraz" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-200">Discord</a>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/35">
        AVHL • 2026–27
      </div>
    </footer>
  );
}
