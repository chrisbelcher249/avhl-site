import Link from "next/link";
import TeamDirectory from "@/components/TeamDirectory";
import { teams } from "../../../data/teams";

export const metadata = {
  title: "Major League Teams",
  description: "Explore all 40 AVHL Major League clubs for the 2026–27 season.",
};

export default function TeamsPage() {
  return (
    <main className="bg-white px-6 py-12 text-[#000B36] md:px-8 md:py-16">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">2026–27 Major League</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">All 40 clubs.</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">
            Browse every Major League franchise by division, or search by team, city, abbreviation, or arena.
          </p>
          <Link
            href="/teams/minor-league"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#000B36]/12 bg-[#000B36] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#A90117]"
          >
            Minor League Teams
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-10">
          <TeamDirectory teams={teams} />
        </div>
      </section>
    </main>
  );
}
