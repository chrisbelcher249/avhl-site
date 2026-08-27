function Stat({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#000B36]/10 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-[10px] font-bold text-[#000B36]/36">{detail}</p> : null}
    </div>
  );
}

function pct(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toFixed(3).replace(/^0/, "");
}

function rate(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric.toFixed(2);
}

function differential(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

export default function FranchiseHistorySection({ team, history, summary }) {
  if (!history.length) return null;

  return (
    <section className="border-y border-[#000B36]/8 bg-[#EEF3F9]">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-8 md:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Franchise history</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Year-by-year results</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">
              Full regular-season metrics for every completed AVHL season in this franchise&apos;s history. Franchise code <span className="font-black text-[#000B36]">{team.abbreviation}</span> keeps prior names and locations connected to the current club.
            </p>
          </div>
          <div className="rounded-full border border-[#000B36]/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#000B36]/52">
            {summary.seasons} historical season{summary.seasons === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Games" value={summary.gp} />
          <Stat label="Wins" value={summary.w} />
          <Stat label="Points" value={summary.pts} />
          <Stat label="Goal Diff." value={differential(summary.gd)} />
          <Stat label="Best season" value={summary.bestSeason?.pts ?? "—"} detail={summary.bestSeason ? `${summary.bestSeason.season} · ${summary.bestSeason.team}` : null} />
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1260px] w-full border-collapse text-sm">
              <thead className="bg-[#000B36] text-white">
                <tr>
                  {[
                    ["Season", "text-left"],
                    ["Team", "text-left"],
                    ["GP", "text-center"],
                    ["W", "text-center"],
                    ["L", "text-center"],
                    ["OTL", "text-center"],
                    ["PTS", "text-center"],
                    ["PTS%", "text-center"],
                    ["RW", "text-center"],
                    ["GF/G", "text-center"],
                    ["GA/G", "text-center"],
                    ["GF", "text-center"],
                    ["GA", "text-center"],
                    ["GD", "text-center"],
                  ].map(([label, align]) => (
                    <th key={label} className={`whitespace-nowrap px-4 py-4 font-black ${align}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={`${row.season}-${row.team}`} className="border-t border-[#000B36]/8 transition hover:bg-[#F7F9FC]">
                    <td className="whitespace-nowrap px-4 py-4 font-black">{row.season}</td>
                    <td className="px-4 py-4">
                      <p className="whitespace-nowrap font-black">{row.team}</p>
                      {row.team !== team.name ? <p className="mt-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-[#A90117]/70">Historical identity</p> : null}
                    </td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.gp}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.w}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.l}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.otl}</td>
                    <td className="px-4 py-4 text-center text-base font-black tabular-nums">{row.pts}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{pct(row.ptsPct)}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.rw}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{rate(row.gfPerGame)}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{rate(row.gaPerGame)}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.gf}</td>
                    <td className="px-4 py-4 text-center font-bold tabular-nums">{row.ga}</td>
                    <td className="px-4 py-4 text-center font-black tabular-nums">{differential(row.gd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#000B36]/8 bg-[#F8FAFD] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#000B36]/38">
            Scroll horizontally to view all historical metrics on smaller screens.
          </div>
        </div>
      </div>
    </section>
  );
}
