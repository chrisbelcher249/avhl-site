import ScheduleExplorer from "@/components/ScheduleExplorer";
import ScheduleQuickActions from "@/components/ScheduleQuickActions";
import { getSchedule } from "@/lib/schedule";
import { gameHasResult } from "@/lib/scheduleFormat";
import { calculateRecordSnapshotsByDate } from "@/lib/standings";
import { saturdayNightShowdowns } from "../../../data/saturdayNightShowdowns";
import { getReplayMetadataMap } from "@/lib/replayStorage";

export const metadata = {
  title: "2026–27 Schedule",
  description: "Browse and filter the live 2026–27 AVHL Major League schedule and results.",
};

export const dynamic = "force-dynamic";

function currentLeagueDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function Schedule() {
  const [{ schedule, source, error }, replayMetadata] = await Promise.all([
    getSchedule(),
    getReplayMetadataMap().catch((replayError) => {
      console.error("Unable to load official replay metadata", replayError);
      return {};
    }),
  ]);
  const scheduleWithReplays = schedule.map((game) => ({ ...game, replayAvailable: Boolean(replayMetadata[String(game.id)]) }));
  const seasonDays = new Set(scheduleWithReplays.map((game) => game.date)).size;
  const completedGames = scheduleWithReplays.filter(gameHasResult).length;
  const recordsByDate = calculateRecordSnapshotsByDate(scheduleWithReplays);
  const todayDate = currentLeagueDate();
  const hasToday = scheduleWithReplays.some((game) => game.date === todayDate);

  return (
    <main className="bg-[#F4F7FB] px-6 py-14 text-[#000B36] md:px-8 md:py-20">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">2026–27 Major League</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">Full season schedule</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#000B36]/58">
              The official AVHL fixture list and live results are joined from the 2026–27 season workbook. Finalized game stats update game cards, team schedules, standings, and the playoff picture automatically.
            </p>
          </div>
          <ScheduleQuickActions hasToday={hasToday} />
        </div>

        <div className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[scheduleWithReplays.length.toLocaleString(), "Games"], [seasonDays, "Season days"], [completedGames, "Results entered"], [source === "live" ? "Live" : "Fallback", "Data source"]].map(([value, label]) => (
            <div key={label} className="rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm">
              <p className="text-3xl font-black md:text-4xl">{value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#000B36]/38">{label}</p>
            </div>
          ))}
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">{error}</p> : null}

        <div className="mt-10">
          <ScheduleExplorer schedule={scheduleWithReplays} recordsByDate={recordsByDate} snsGames={saturdayNightShowdowns} todayDate={todayDate} />
        </div>
      </section>
    </main>
  );
}
