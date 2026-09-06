import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayers } from "@/lib/players";
import { getHistoricalPlayer, getKnownPlayerIdentity } from "@/lib/playerHistory";
import { teams } from "../../../../data/teams";

export const dynamic = "force-dynamic";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function normalizeId(value) {
  return String(value || "").replace(/\D/g, "").padStart(4, "0");
}

function pct(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(3).replace(/^0/, "");
}

function money(value) {
  return Number.isFinite(value) && value > 0 ? currency.format(value) : "Unsigned";
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#000B36]/10 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#000B36]/38">{label}</p>
      <p className="mt-1.5 text-sm font-black">{value ?? "—"}</p>
    </div>
  );
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const identity = getKnownPlayerIdentity(normalizeId(id));
  if (!identity) return {};
  return {
    title: identity.name,
    description: `${identity.name} — permanent AVHL player profile and career statistics.`,
  };
}

export default async function PlayerProfilePage({ params }) {
  const { id } = await params;
  const playerId = normalizeId(id);
  const history = getHistoricalPlayer(playerId);
  const { players } = await getPlayers();
  const current = players.find((player) => player.id === playerId) || null;

  if (!current && !history) notFound();

  const name = current?.name || history.name;
  const role = current?.role || history.role;
  const goalie = role === "Goalie";
  const currentTeam = current && current.currentTeam !== "UFA" ? teams.find((team) => team.name === current.currentTeam) : null;
  const accent = currentTeam?.colors?.primary || "#18BDFC";
  const hasCurrentRecord = Boolean(current);

  const careerBlocks = history
    ? goalie
      ? [["Shots against", history.career.sa.toLocaleString()], ["Saves", history.career.sv.toLocaleString()], ["Save percentage", pct(history.career.svPct)]]
      : [["Goals", history.career.g.toLocaleString()], ["Assists", history.career.a.toLocaleString()], ["Points", history.career.pts.toLocaleString()]]
    : [];

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000724] text-white">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_82%_20%,rgba(24,189,252,0.24),transparent_30%),radial-gradient(circle_at_12%_100%,rgba(169,1,23,0.34),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/players" className="text-sm font-black text-white/55 transition hover:text-white">← All players</Link>
            <Link href="/statistics/career" className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/65 transition hover:bg-white hover:text-[#000B36]">Career statistics</Link>
          </div>

          <div className="mt-10 grid items-end gap-8 lg:grid-cols-[auto_1fr_auto]">
            {currentTeam ? (
              <Link href={`/teams/${currentTeam.slug}`} className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white p-4 shadow-xl md:h-36 md:w-36">
                <Image src={currentTeam.assets.logo} alt={`${currentTeam.name} logo`} width={160} height={160} className="h-full w-full object-contain" priority />
              </Link>
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/15 bg-white/[0.08] text-3xl font-black md:h-36 md:w-36">
                {current?.number ?? "AVHL"}
              </div>
            )}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">AVHL ID {playerId}</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl md:text-7xl">{name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
                {current?.position ? <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5">{current.position}</span> : <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5">{role}</span>}
                {current?.number !== null && current?.number !== undefined ? <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5">#{current.number}</span> : null}
                {currentTeam ? <Link href={`/teams/${currentTeam.slug}`} className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 transition hover:bg-white hover:text-[#000B36]">{currentTeam.name}</Link> : null}
                {current && current.currentTeam === "UFA" ? <span className="rounded-full bg-[#A90117] px-3 py-1.5">UFA</span> : null}
                {!current ? <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-white/55">Historical player</span> : null}
              </div>
              <p className="mt-4 text-sm font-semibold text-white/50">
                {current ? `${current.proTeam || "Pro club unavailable"}${current.league ? ` · ${current.league}` : ""}` : "No 2026–27 player-pool record."}
              </p>
            </div>

            {current?.overall ? (
              <div className="w-fit rounded-3xl border border-white/15 bg-white/[0.08] px-6 py-5 text-center backdrop-blur">
                <p className="text-4xl font-black tabular-nums">{current.overall}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Overall</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="h-1.5" style={{ backgroundColor: accent }} />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        {current ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Current AVHL team" value={current.currentTeam} />
            <Detail label="Jersey number" value={current.number ?? "—"} />
            <Detail label="Age" value={current.age ?? "—"} />
            <Detail label="Contract" value={current.aav ? `${money(current.aav)} AAV · ${current.yearsLeft ?? "—"} yr${Number(current.yearsLeft) === 1 ? "" : "s"} left` : "Unsigned"} />
            <Detail label="Position" value={current.position || role} />
            <Detail label="Size" value={[current.height, current.weight ? `${current.weight} lb` : null].filter(Boolean).join(" · ") || "—"} />
            <Detail label={goalie ? "Glove" : "Shoots"} value={current.handedness || "—"} />
            <Detail label="Player type" value={current.playerType || role} />
          </div>
        ) : (
          <div className="rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Historical player</p>
            <h2 className="mt-2 text-2xl font-black">No current 2026–27 player record</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#000B36]/50">This player remains in the permanent AVHL archive through their historical statistics, but is not part of the current player database.</p>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-3xl bg-[#000B36] p-6 text-white shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">AVHL career</p>
            <h2 className="mt-2 text-3xl font-black">Career totals</h2>
            {history ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {careerBlocks.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-2xl font-black tabular-nums">{value}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <p className="font-black">No recorded AVHL statistics through 2025–26.</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/48">The profile is active because this player is in the current 2026–27 database. Historical totals will appear here once the player records AVHL statistics.</p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
            <div className="border-b border-[#000B36]/8 p-6 md:p-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Season by season</p>
              <h2 className="mt-1 text-3xl font-black">Historical statistics</h2>
              <p className="mt-2 text-sm font-semibold text-[#000B36]/45">Past-season stat lines are intentionally shown without a team assignment.</p>
            </div>
            {history ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] border-collapse text-left">
                  <thead className="bg-[#F6F8FC] text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/42">
                    <tr>
                      <th className="px-6 py-3">Season</th>
                      {goalie ? <><th className="px-6 py-3 text-center">SA</th><th className="px-6 py-3 text-center">SV</th><th className="px-6 py-3 text-center">SV%</th></> : <><th className="px-6 py-3 text-center">G</th><th className="px-6 py-3 text-center">A</th><th className="px-6 py-3 text-center">PTS</th></>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#000B36]/8">
                    {history.seasons.map((row) => (
                      <tr key={row.season}>
                        <td className="px-6 py-4 font-black">{row.season}</td>
                        {goalie ? <><td className="px-6 py-4 text-center font-bold tabular-nums">{row.sa}</td><td className="px-6 py-4 text-center font-bold tabular-nums">{row.sv}</td><td className="px-6 py-4 text-center font-black tabular-nums">{pct(row.svPct)}</td></> : <><td className="px-6 py-4 text-center font-bold tabular-nums">{row.g}</td><td className="px-6 py-4 text-center font-bold tabular-nums">{row.a}</td><td className="px-6 py-4 text-center font-black tabular-nums">{row.pts}</td></>}
                      </tr>
                    ))}
                    <tr className="bg-[#000B36] text-white">
                      <td className="px-6 py-4 font-black">Career</td>
                      {goalie ? <><td className="px-6 py-4 text-center font-black tabular-nums">{history.career.sa}</td><td className="px-6 py-4 text-center font-black tabular-nums">{history.career.sv}</td><td className="px-6 py-4 text-center font-black tabular-nums">{pct(history.career.svPct)}</td></> : <><td className="px-6 py-4 text-center font-black tabular-nums">{history.career.g}</td><td className="px-6 py-4 text-center font-black tabular-nums">{history.career.a}</td><td className="px-6 py-4 text-center font-black tabular-nums">{history.career.pts}</td></>}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-sm font-semibold text-[#000B36]/48">No historical stat rows are recorded for this player through the end of 2025–26.</div>
            )}
          </div>
        </div>

        {current && Object.keys(current.ratings || {}).length ? (
          <div className="mt-8 rounded-3xl border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">2026–27 ratings</p>
                <h2 className="mt-1 text-3xl font-black">Player attributes</h2>
              </div>
              <span className="rounded-full px-4 py-2 text-sm font-black text-white" style={{ backgroundColor: accent }}>{current.overall ?? "—"} OVR</span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.entries(current.ratings).filter(([, value]) => value !== null && value !== undefined).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[#000B36]/10 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold"><span>{label}</span><span>{value}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#000B36]/8"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%`, backgroundColor: accent }} /></div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
