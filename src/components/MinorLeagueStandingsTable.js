import Image from "next/image";
import Link from "next/link";

export default function MinorLeagueStandingsTable({ standings, completedGames }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#000B36]/10 bg-white shadow-[0_12px_40px_rgba(0,11,54,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[#000B36]/10 bg-[#000724] px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between md:px-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">League table</p>
          <h2 className="mt-1 text-2xl font-black">2026–27 Minor League Standings</h2>
        </div>
        <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
          Top 3 promoted
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-[#F6F8FC] text-[10px] font-black uppercase tracking-[0.12em] text-[#000B36]/42">
            <tr>
              <th className="w-14 px-4 py-3 text-center">#</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-3 py-3 text-center">GP</th>
              <th className="px-3 py-3 text-center">W</th>
              <th className="px-3 py-3 text-center">L</th>
              <th className="px-3 py-3 text-center">OTL</th>
              <th className="px-3 py-3 text-center">RW</th>
              <th className="px-3 py-3 text-center">GF</th>
              <th className="px-3 py-3 text-center">GA</th>
              <th className="px-3 py-3 text-center">GD</th>
              <th className="px-4 py-3 text-center">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((record, index) => {
              const promotion = completedGames > 0 && index < 3;
              return (
                <tr key={record.team.slug} className={`relative border-t border-[#000B36]/8 ${promotion ? "bg-cyan-50/80" : "bg-white"}`}>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${promotion ? "bg-[#000B36] text-cyan-200" : "bg-[#F1F4F8] text-[#000B36]/58"}`}>
                      {completedGames ? record.rank : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/minor-league/${record.team.slug}`} className="group flex items-center gap-3">
                      <Image src={record.team.assets.logo} alt="" width={44} height={44} className="h-9 w-9 object-contain transition group-hover:scale-105" />
                      <div className="min-w-0">
                        <p className="truncate font-black group-hover:text-[#A90117]">{record.team.name}</p>
                        {promotion ? <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#0088B5]">Promotion position</p> : null}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-center font-bold">{record.gp}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.wins}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.losses}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.otl}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.rw}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.gf}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.ga}</td>
                  <td className="px-3 py-3 text-center font-bold">{record.gd > 0 ? `+${record.gd}` : record.gd}</td>
                  <td className="px-4 py-3 text-center text-base font-black">{record.pts}</td>
                </tr>
              );
            }).reduce((rows, row, index) => {
              rows.push(row);
              if (index === 2) {
                rows.push(
                  <tr key="promotion-cutoff" aria-hidden="true">
                    <td colSpan={11} className="p-0">
                      <div className="relative h-10 bg-gradient-to-r from-cyan-50 via-white to-cyan-50">
                        <div className="absolute inset-x-4 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-[#18BDFC] to-transparent" />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#18BDFC]/40 bg-[#000B36] px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200 shadow-sm">
                          Promotion line · Top 3
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }
              return rows;
            }, [])}
          </tbody>
        </table>
      </div>
    </div>
  );
}
