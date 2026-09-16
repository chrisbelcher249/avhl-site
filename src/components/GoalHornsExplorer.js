"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

const divisions = ["All", "Pacific", "Central", "Atlantic", "Metropolitan"];

function hornPath(abbreviation) {
  return `/goal-horns/26_${abbreviation}_Horn.mp3`;
}

export default function GoalHornsExplorer({ teams }) {
  const audioRef = useRef(null);
  const audioTeamRef = useRef(null);
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("All");
  const [activeAbbreviation, setActiveAbbreviation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState({});

  const visibleTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return teams.filter((team) => {
      const divisionMatch = division === "All" || team.division === division;
      const searchMatch = !normalized || [team.name, team.city, team.nickname, team.abbreviation, team.division]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
      return divisionMatch && searchMatch;
    });
  }, [teams, query, division]);

  async function toggleHorn(team) {
    const audio = audioRef.current;
    if (!audio || unavailable[team.abbreviation]) return;

    if (activeAbbreviation === team.abbreviation && !audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (activeAbbreviation !== team.abbreviation) {
      audio.pause();
      audioTeamRef.current = team.abbreviation;
      audio.src = hornPath(team.abbreviation);
      audio.currentTime = 0;
      audio.load();
      setActiveAbbreviation(team.abbreviation);
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      if (error?.name !== "AbortError") {
        setUnavailable((current) => ({ ...current, [team.abbreviation]: true }));
        audioTeamRef.current = null;
        setActiveAbbreviation(null);
        setIsPlaying(false);
      }
    }
  }

  function stopHorn() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  }

  return (
    <div>
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          const failedAbbreviation = audioTeamRef.current;
          if (failedAbbreviation) {
            setUnavailable((current) => ({ ...current, [failedAbbreviation]: true }));
          }
          audioTeamRef.current = null;
          setActiveAbbreviation(null);
          setIsPlaying(false);
        }}
      />

      <div className="sticky top-[65px] z-30 -mx-6 border-y border-[#000B36]/10 bg-white/95 px-6 py-4 backdrop-blur md:mx-0 md:rounded-3xl md:border md:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row xl:max-w-xl">
            <label className="relative block w-full">
              <span className="sr-only">Search goal horns</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team, city, abbreviation…"
                className="w-full rounded-full border border-[#000B36]/15 bg-[#F6F8FC] px-5 py-3 text-sm font-bold outline-none transition placeholder:text-[#000B36]/35 focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/15"
              />
            </label>
            {activeAbbreviation ? (
              <button
                type="button"
                onClick={stopHorn}
                className="shrink-0 rounded-full border border-[#000B36]/12 bg-white px-5 py-3 text-xs font-black uppercase tracking-wide text-[#000B36]/65 transition hover:border-[#A90117] hover:text-[#A90117]"
              >
                Stop audio
              </button>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {divisions.map((filter) => (
              <button
                type="button"
                key={filter}
                onClick={() => setDivision(filter)}
                className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black uppercase tracking-wide transition ${division === filter ? "bg-[#000B36] text-white" : "border border-[#000B36]/12 bg-white text-[#000B36]/65 hover:border-[#18BDFC] hover:text-[#000B36]"}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#000B36]/50">Showing {visibleTeams.length} of {teams.length} Major League clubs</p>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#000B36]/35">Manual play only · one horn at a time</p>
      </div>

      <div className="mt-8 space-y-14">
        {divisions.slice(1).map((divisionName) => {
          const divisionTeams = visibleTeams.filter((team) => team.division === divisionName);
          if (!divisionTeams.length) return null;
          const conference = divisionTeams[0].conference;

          return (
            <section key={divisionName} id={divisionName.toLowerCase()} className="scroll-mt-36">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#000B36]/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#A90117]">{conference} Conference</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{divisionName} Division</h2>
                </div>
                <span className="hidden text-sm font-bold text-[#000B36]/40 sm:block">{divisionTeams.length} teams</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {divisionTeams.map((team) => {
                  const isActive = activeAbbreviation === team.abbreviation;
                  const missing = Boolean(unavailable[team.abbreviation]);
                  const playing = isActive && isPlaying;

                  return (
                    <article
                      id={team.abbreviation}
                      key={team.abbreviation}
                      className={`scroll-mt-36 overflow-hidden rounded-3xl border bg-white shadow-[0_8px_30px_rgba(0,11,54,0.05)] transition ${isActive ? "border-[#18BDFC] ring-4 ring-[#18BDFC]/10" : "border-[#000B36]/10"}`}
                    >
                      <div className="h-2" style={{ backgroundColor: team.colors.primary }} />
                      <div className="p-5">
                        <div className="flex h-24 items-center justify-center">
                          <Image src={team.assets.logo} alt={`${team.name} logo`} width={700} height={700} className="h-24 w-24 object-contain" />
                        </div>
                        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-[#000B36]/40">{team.city}</p>
                        <h3 className="mt-1 text-xl font-black leading-tight">{team.nickname}</h3>
                        <p className="mt-1 text-xs font-black uppercase tracking-wide text-[#000B36]/30">{team.abbreviation}</p>

                        <button
                          type="button"
                          onClick={() => toggleHorn(team)}
                          disabled={missing}
                          aria-label={`${playing ? "Pause" : "Play"} ${team.name} goal horn`}
                          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black uppercase tracking-wide transition ${missing ? "cursor-not-allowed bg-[#EEF1F5] text-[#000B36]/30" : playing ? "bg-[#A90117] text-white hover:bg-[#8E0013]" : "bg-[#000B36] text-white hover:bg-[#18BDFC] hover:text-[#000B36]"}`}
                        >
                          <span aria-hidden="true" className="text-base leading-none">{missing ? "×" : playing ? "Ⅱ" : "▶"}</span>
                          {missing ? "Horn not uploaded" : playing ? "Pause horn" : isActive ? "Resume horn" : "Play horn"}
                        </button>

                        <Link href={`/teams/${team.slug}`} className="mt-4 block text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/35 transition hover:text-[#A90117]">
                          View team →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {visibleTeams.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-[#000B36]/20 bg-[#F6F8FC] p-10 text-center">
          <p className="text-xl font-black">No clubs match that search.</p>
          <button type="button" onClick={() => { setQuery(""); setDivision("All"); }} className="mt-3 text-sm font-black text-[#A90117]">Clear filters</button>
        </div>
      ) : null}
    </div>
  );
}
