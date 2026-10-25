import Link from "next/link";

function dateLabel(value) {
  if (!value) return "After season / TBD";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

export default function TeamInjuriesSection({ team, injuries = [], playersById = {} }) {
  return (
    <section id="team-injuries" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-10 md:px-8 md:py-12">
      <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#000B36]/10 bg-[#F6F8FC] px-5 py-4 md:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#A90117]">Player availability</p>
            <h2 className="mt-1 text-2xl font-black">Active Injuries <span className="text-[#000B36]/35">({injuries.length})</span></h2>
          </div>
          <Link href="/injuries" className="rounded-full border border-[#000B36]/15 px-4 py-2 text-xs font-black transition hover:border-[#18BDFC]">League injury report →</Link>
        </div>
        {injuries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-[#000B36] text-[10px] font-black uppercase tracking-[0.12em] text-white">
                <tr>
                  {["Player", "Pos", "OVR", "Injury", "Date Injured", "Games Remaining", "Expected Return"].map((label) => (
                    <th key={label} scope="col" className="px-4 py-3">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000B36]/8">
                {injuries.map((injury) => (
                  <tr key={injury.storageKey || `${injury.officialGameId}:${injury.playerId}`} className="hover:bg-[#F8FAFD]">
                    <td className="px-4 py-3.5 font-black"><Link href={`/players/${injury.playerId}`} className="hover:text-[#A90117]">{injury.playerName}</Link></td>
                    <td className="px-4 py-3.5 font-bold">{injury.position || "—"}</td>
                    <td className="px-4 py-3.5 font-black">{playersById[injury.playerId]?.overall ?? "—"}</td>
                    <td className="px-4 py-3.5 font-bold">{injury.injuryType}</td>
                    <td className="px-4 py-3.5 font-bold">{injury.injuryDate ? dateLabel(injury.injuryDate) : "—"}</td>
                    <td className="px-4 py-3.5 font-black tabular-nums">{injury.gamesRemaining}</td>
                    <td className="px-4 py-3.5 font-bold">{dateLabel(injury.expectedReturnDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-7 text-sm font-semibold text-[#000B36]/55">No active injuries are currently reported for {team.name}.</p>
        )}
      </div>
    </section>
  );
}
