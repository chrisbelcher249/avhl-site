import Image from "next/image";
import Link from "next/link";

const navItems = [
  ["Teams", "/teams"],
  ["Players", "/players"],
  ["Trades", "/trades"],
  ["Standings", "/standings"],
  ["Schedule", "/schedule"],
  ["Statistics", "/statistics"],
  ["History", "/history"],
  ["League Info", "/info"],
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#000B36]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="AVHL home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
            <Image src="/avhl-logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" priority />
          </span>
          <span>
            <span className="block text-lg font-black leading-none tracking-tight">AVHL</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200 sm:block">
              American Virtual Hockey League
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm font-extrabold text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <details className="relative lg:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-white/20 px-4 py-2 text-sm font-black uppercase tracking-wide">
            Menu
          </summary>
          <nav className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#000B36] p-2 shadow-2xl" aria-label="Mobile navigation">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-sm font-extrabold text-white/80 hover:bg-white/10 hover:text-white">
                {label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
