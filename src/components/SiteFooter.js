import Image from "next/image";
import Link from "next/link";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="1" className="fill-current stroke-none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M23.1 7.2a3.2 3.2 0 0 0-2.25-2.27C18.86 4.4 12 4.4 12 4.4s-6.86 0-8.85.53A3.2 3.2 0 0 0 .9 7.2 33.4 33.4 0 0 0 .4 12c0 1.62.17 3.23.5 4.8a3.2 3.2 0 0 0 2.25 2.27c1.99.53 8.85.53 8.85.53s6.86 0 8.85-.53a3.2 3.2 0 0 0 2.25-2.27c.33-1.57.5-3.18.5-4.8 0-1.62-.17-3.23-.5-4.8ZM9.7 15.25v-6.5L15.65 12 9.7 15.25Z" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M4.3 2 2 5.9v14h5.1V22l2.9-2.1h4l7-7V2H4.3Zm14.4 10-4 4h-4.6l-2.4 1.8V16H4.9V4.3h13.8V12Zm-3-5.3h-2.3v5.8h2.3V6.7Zm-5 0H8.4v5.8h2.3V6.7Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M19.5 5.3A17 17 0 0 0 15.3 4l-.5 1a15 15 0 0 0-5.6 0l-.5-1a17 17 0 0 0-4.2 1.3C1.8 9.2 1 13 1.3 16.8a17 17 0 0 0 5.2 2.6l1.3-1.8c-.7-.3-1.4-.7-2-1.2l.5-.4a12 12 0 0 0 11.4 0l.5.4c-.6.5-1.3.9-2 1.2l1.3 1.8a17 17 0 0 0 5.2-2.6c.4-4.4-.7-8.1-3.2-11.5ZM8.4 14.8c-1 0-1.9-1-1.9-2.3s.8-2.3 1.9-2.3 1.9 1 1.9 2.3-.9 2.3-1.9 2.3Zm7.2 0c-1 0-1.9-1-1.9-2.3s.8-2.3 1.9-2.3 1.9 1 1.9 2.3-.8 2.3-1.9 2.3Z" />
    </svg>
  );
}

const navGroups = [
  {
    title: "League",
    links: [
      ["Teams", "/teams"],
      ["Players", "/players"],
      ["Schedule", "/schedule"],
      ["Standings", "/standings"],
      ["Statistics", "/statistics"],
    ],
  },
  {
    title: "League Tools",
    links: [
      ["Cap", "/cap"],
      ["Trades", "/trades"],
      ["Draft", "/draft"],
      ["Rivals", "/rivals"],
      ["Goal Horns", "/horns"],
    ],
  },
  {
    title: "More AVHL",
    links: [
      ["League Info", "/info"],
      ["History", "/info/history"],
      ["Champions", "/info/champions"],
      ["Playoff Brackets", "/info/history/brackets"],
      ["Minor League", "/teams/minor-league"],
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#000724] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
                <Image src="/avhl-logo.png" alt="AVHL" width={48} height={48} className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">American Virtual Hockey League</p>
                <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">AVHL · 2026–27</p>
              </div>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/55">
              Hockey, reimagined. A custom league universe built around franchise identity, long-term history, promotion and relegation, and season-by-season storytelling.
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">Follow the AVHL</p>
            <a
              href="https://www.instagram.com/avhl_hockey/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.07] px-5 py-4 transition hover:border-cyan-300/60 hover:bg-cyan-300/[0.11]"
              aria-label="Follow AVHL on Instagram"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300 text-[#000724]">
                  <InstagramIcon />
                </span>
                <div>
                  <div className="text-sm font-black uppercase tracking-[0.08em] text-cyan-200">Instagram</div>
                  <div className="mt-0.5 text-sm font-bold text-white/75">@avhl_hockey</div>
                </div>
              </div>
              <span className="text-xl text-cyan-200 transition group-hover:translate-x-1">→</span>
            </a>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <a
                href="https://www.twitch.tv/avhl_hockey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                aria-label="Watch AVHL on Twitch"
              >
                <TwitchIcon /> Twitch
              </a>
              <a
                href="https://www.youtube.com/@AVHL_hockey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                aria-label="Watch AVHL on YouTube"
              >
                <YouTubeIcon /> YouTube
              </a>
              <a
                href="https://discord.com/invite/ZTqfdqwraz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                aria-label="Join the AVHL Discord"
              >
                <DiscordIcon /> Discord
              </a>
            </div>
          </div>
        </div>

        <div className="mt-9 grid gap-7 border-t border-white/10 pt-8 sm:grid-cols-3">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">{group.title}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
                {group.links.map(([label, href]) => (
                  <Link key={href} href={href} className="text-sm font-bold text-white/60 transition hover:text-cyan-200">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-4 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/30">
        AVHL · American Virtual Hockey League · 2026–27
      </div>
    </footer>
  );
}
