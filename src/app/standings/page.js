import Image from "next/image";
import Link from "next/link";
import { getSchedule } from "@/lib/schedule";
import { calculateStandings } from "@/lib/standings";

export const metadata = {
  title: "Standings",
  description: "Live 2026–27 AVHL standings, division races, wild cards, and playoff picture calculated from official schedule results.",
};

export const dynamic = "force-dynamic";

function pct(value) {
  return Number(value || 0).toFixed(3);
}

function perGame(value) {
  return Number(value || 0).toFixed(2);
}

function StandingRow({ record, label }) {
  return (
    <tr className="border-t border-[#000B36]/8 bg-white even:bg-[#FAFBFD]">
      <td className="whitespace-nowrap px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.1em] text-[#A90117]">{label}</td>
      <td className="min-w-[240px] px-4 py-3">
        <Link href={`/teams/${record.team.slug}`} className="flex items-center gap-3 font-black transition hover:text-[#A90117]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F4F8] p-1.5">
            <Image src={record.team.assets.logo} alt="" width={36} height={36} className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-sm">{record.team.name}</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-[0.13em] text-[#000B36]/32">{record.team.abbreviation}</span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-3 text-center font-black">{record.gp}</td>
      <td className="px-3 py-3 text-center font-black">{record.wins}</td>
      <td className="px-3 py-3 text-center font-black">{record.losses}</td>
      <td className="px-3 py-3 text-center font-black">{record.otl}</td>
      <td className="px-3 py-3 text-center text-base font-black">{record.pts}</td>
      <td className="px-3 py-3 text-center font-bold">{pct(record.ptsPct)}</td>
      <td className="px-3 py-3 text-center font-black">{record.rw}</td>
      <td className="px-3 py-3 text-center font-bold">{perGame(record.gfPerGame)}</td>
      <td className="px-3 py-3 text-center font-bold">{perGame(record.gaPerGame)}</td>
      <td className="px-3 py-3 text-center font-bold">{record.gf}</td>
      <td className="px-3 py-3 text-center font-bold">{record.ga}</td>
      <td className={`px-3 py-3 text-center font-black ${record.gd > 0 ? "text-emerald-700" : record.gd < 0 ? "text-[#A90117]" : ""}`}>{record.gd}</td>
    </tr>
  );
}

function StandingsTable({ title, records, labelForIndex }) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#000B36]/10 bg-white shadow-sm">
      <div className="border-b border-[#000B36]/8 bg-[#F5F7FB] px-5 py-4">
        <h3 className="text-xl font-black">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1260px] w-full border-collapse text-sm">
          <thead className="bg-[#000B36] text-white">
            <tr className="text-[9px] font-black uppercase tracking-[0.12em]">
              {[
                "Seed", "Team", "GP", "W", "L", "OTL", "PTS", "PTS%", "RW", "GF/G", "GA/G", "GF", "GA", "GD",
              ].map((heading) => (
                <th key={heading} className={`px-3 py-3 ${heading === "Team" ? "text-left" : "text-center"}`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <StandingRow key={record.team.slug} record={record} label={labelForIndex(index, record)} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SeedCard({ record, muted = false }) {
  if (!record) return null;
  return (
    <Link href={`/teams/${record.team.slug}`} className={`flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 transition hover:border-[#18BDFC] ${muted ? "border-[#000B36]/8 bg-[#F7F9FC]" : "border-[#000B36]/10 bg-white"}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
        <Image src={record.team.assets.logo} alt="" width={36} height={36} className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">{record.team.name}</span>
        <span className="mt-0.5 block text-[9px] font-black uppercase tracking-[0.13em] text-[#000B36]/35">Seed {record.seed}</span>
      </span>
    </Link>
  );
}

function Matchup({ label, teamA, teamB, note }) {
  return (
    <div className="rounded-3xl border border-[#000B36]/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#A90117]">{label}</p>
        {note ? <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/30">{note}</span> : null}
      </div>
      <div className="space-y-2">
        <SeedCard record={teamA} />
        <div className="px-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-[#000B36]/25">vs</div>
        <SeedCard record={teamB} />
      </div>
    </div>
  );
}

function FutureMatchup({ label, seededTeam, qualifierText }) {
  return (
    <div className="rounded-3xl border border-[#000B36]/10 bg-[#F7F9FC] p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">{label}</p>
      <SeedCard record={seededTeam} muted />
      <div className="my-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-[#000B36]/25">vs</div>
      <div className="rounded-2xl border border-dashed border-[#000B36]/16 bg-white px-4 py-4 text-center text-xs font-black text-[#000B36]/50">{qualifierText}</div>
    </div>
  );
}

function PlayoffPicture({ conference, seeds }) {
  const seed = (number) => seeds.find((record) => record.seed === number);
  return (
    <section className="rounded-[2rem] border border-[#000B36]/10 bg-white p-5 shadow-sm md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#A90117]">Current postseason field</p>
          <h3 className="mt-1 text-3xl font-black">{conference} Conference</h3>
        </div>
        <p className="text-xs font-bold text-[#000B36]/40">Top 3 per division + 4 wild cards</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#000B36]/40">Qualifier round</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Matchup label="Qualifier A" teamA={seed(8)} teamB={seed(9)} note="8 vs 9" />
            <Matchup label="Qualifier B" teamA={seed(7)} teamB={seed(10)} note="7 vs 10" />
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#000B36]/40">Round 1 if season ended today</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FutureMatchup label="1 seed matchup" seededTeam={seed(1)} qualifierText="Winner of Seeds 8 / 9" />
            <Matchup label="4 vs 5" teamA={seed(4)} teamB={seed(5)} />
            <FutureMatchup label="2 seed matchup" seededTeam={seed(2)} qualifierText="Winner of Seeds 7 / 10" />
            <Matchup label="3 vs 6" teamA={seed(3)} teamB={seed(6)} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function StandingsPage() {
  const { schedule, source, error } = await getSchedule();
  const { conferences, completedGames } = calculateStandings(schedule);

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-16 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_10%_95%,rgba(169,1,23,0.30),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-cyan-200">2026–27 Major League</p>
          <h1 className="mt-3 text-5xl font-black uppercase tracking-tight md:text-7xl">Standings</h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
            Calculated automatically from the scores and OT results entered in the official live schedule. Ties in points are ordered by regulation wins, goal differential, goals for, and wins.
          </p>
          <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-3">
            {[[completedGames, "Games completed"], [schedule.length - completedGames, "Games remaining"], [source === "live" ? "Live" : "Fallback", "Schedule source"]].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur">
                <p className="text-3xl font-black">{value}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 md:px-8 md:py-14">
        {error ? <p className="mb-6 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

        <div className="space-y-16">
          {conferences.map((conferenceData) => (
            <section key={conferenceData.conference}>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">League table</p>
                  <h2 className="mt-1 text-4xl font-black">{conferenceData.conference} Conference</h2>
                </div>
                <p className="text-xs font-bold text-[#000B36]/42">PTS → RW → GD → GF → W</p>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                {conferenceData.divisionSections.map((division) => (
                  <StandingsTable
                    key={division.name}
                    title={`${division.name} Division — Top 3`}
                    records={division.topThree}
                    labelForIndex={(index) => `${division.name.slice(0, 3).toUpperCase()} ${index + 1}`}
                  />
                ))}
              </div>

              <div className="mt-5">
                <StandingsTable
                  title="Wild Cards"
                  records={conferenceData.wildCards}
                  labelForIndex={(index) => `WC ${index + 1}`}
                />
              </div>

              <div className="mt-5">
                <StandingsTable
                  title="Outside Looking In"
                  records={conferenceData.outside}
                  labelForIndex={(index) => `${index + 11}`}
                />
              </div>

              <div className="mt-8">
                {completedGames > 0 ? (
                  <PlayoffPicture conference={conferenceData.conference} seeds={conferenceData.seeds} />
                ) : (
                  <div className="rounded-[2rem] border border-dashed border-[#000B36]/18 bg-white p-8 text-center">
                    <p className="text-2xl font-black">Playoff picture activates after the first result.</p>
                    <p className="mt-2 text-sm font-semibold text-[#000B36]/45">Once a score is entered in the live schedule, seeds 1–10 and qualifier matchups will populate automatically.</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
