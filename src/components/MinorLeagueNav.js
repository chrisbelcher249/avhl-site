import Link from "next/link";

const items = [
  { key: "teams", label: "Teams", href: "/minor-league" },
  { key: "standings", label: "Standings", href: "/minor-league/standings" },
  { key: "schedule", label: "Schedule", href: "/minor-league/schedule" },
];

export default function MinorLeagueNav({ active = "teams" }) {
  return (
    <nav aria-label="Minor League" className="flex flex-wrap gap-2 rounded-3xl border border-[#000B36]/10 bg-white p-2 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-full px-5 py-2.5 text-sm font-black transition ${active === item.key ? "bg-[#000B36] text-white" : "text-[#000B36]/58 hover:bg-[#000B36]/5 hover:text-[#000B36]"}`}
        >
          {item.label}
        </Link>
      ))}
      <Link href="/teams" className="ml-auto rounded-full px-5 py-2.5 text-sm font-black text-[#A90117] transition hover:bg-[#A90117]/5">
        Major League →
      </Link>
    </nav>
  );
}
