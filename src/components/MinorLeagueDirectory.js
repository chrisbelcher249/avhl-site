"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const filters = ["All", "Pacific", "Central", "Atlantic", "Metropolitan"];

export default function MinorLeagueDirectory({ teams }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("All");

  const visibleTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return teams.filter((team) => {
      const divisionMatch = division === "All" || team.division === division;
      const searchMatch = !normalized || [
        team.name,
        team.city,
        team.nickname,
        team.abbreviation,
        team.arena,
        team.division,
        team.mascot?.name,
        team.affiliate?.name,
        team.affiliate?.abbreviation,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
      return divisionMatch && searchMatch;
    });
  }, [teams, query, division]);

  return (
    <div>
      <div className="sticky top-[65px] z-30 -mx-6 border-y border-[#000B36]/10 bg-white/95 px-6 py-4 backdrop-blur md:mx-0 md:rounded-3xl md:border md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search Minor League teams</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team, city, affiliate…"
              className="w-full rounded-full border border-[#000B36]/15 bg-[#F6F8FC] px-5 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/35 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/15"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setDivision(filter)}
                className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wide transition ${division === filter ? "bg-[#000B36] text-white" : "border border-[#000B36]/12 bg-white text-[#000B36]/65 hover:border-[#18BDFC] hover:text-[#000B36]"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm font-bold text-[#000B36]/50">
        Showing {visibleTeams.length} of {teams.length} Minor League clubs
      </p>

      <div className="mt-8 space-y-14">
        {filters.slice(1).map((divisionName) => {
          const divisionTeams = visibleTeams.filter((team) => team.division === divisionName);
          if (!divisionTeams.length) return null;
          const conference = divisionTeams[0].conference;

          return (
            <section key={divisionName} id={divisionName.toLowerCase()} className="scroll-mt-36">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#000B36]/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#A90117]">{conference} Conference Affiliates</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{divisionName} Division</h2>
                </div>
                <span className="hidden text-sm font-bold text-[#000B36]/40 sm:block">{divisionTeams.length} teams</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {divisionTeams.map((team) => (
                  <article
                    key={team.abbreviation}
                    className="relative overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-[0_8px_30px_rgba(0,11,54,0.05)]"
                  >
                    <div className="h-2" style={{ backgroundColor: team.colors.primary }} />
                    <div className="p-5">
                      <div className="flex h-24 items-center justify-center">
                        <Image
                          src={team.assets.logo}
                          alt={`${team.name} logo`}
                          width={700}
                          height={700}
                          className="h-24 w-24 object-contain"
                        />
                      </div>
                      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#000B36]/40">{team.city}</p>
                      <h3 className="mt-1 text-xl font-black leading-tight">{team.nickname}</h3>
                      <p className="mt-3 truncate text-sm font-semibold text-[#000B36]/55">{team.arena}</p>

                      <div className="mt-5 border-t border-[#000B36]/8 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35">Major League affiliate</p>
                        <div className="mt-1 flex items-end justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-black text-[#000B36]">{team.affiliate.name}</p>
                          <span className="shrink-0 text-xs font-black text-[#000B36]/30">{team.abbreviation}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {visibleTeams.length === 0 && (
        <div className="mt-12 rounded-3xl border border-dashed border-[#000B36]/20 bg-[#F6F8FC] p-10 text-center">
          <p className="text-xl font-black">No Minor League clubs match that search.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDivision("All");
            }}
            className="mt-3 text-sm font-black text-[#A90117]"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
