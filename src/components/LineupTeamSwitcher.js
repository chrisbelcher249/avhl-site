"use client";

import { useRouter } from "next/navigation";

export default function LineupTeamSwitcher({ teams, activeSlug }) {
  const router = useRouter();

  return (
    <label className="block min-w-0">
      <span className="sr-only">Choose team lineup</span>
      <select
        value={activeSlug}
        onChange={(event) => router.push(`/teams/${event.target.value}/lineups`)}
        className="w-full min-w-0 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white outline-none backdrop-blur transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15"
      >
        {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((team) => (
          <option key={team.slug} value={team.slug} className="bg-white text-[#000B36]">
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
