import { draftPickYears } from "../../data/draftPicks";

const roundNames = {
  1: "1st Round",
  2: "2nd Round",
  3: "3rd Round",
};

function headerTextColor(hex) {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 160 ? "#000B36" : "#FFFFFF";
}

export default function DraftPickSection({ team, picks }) {
  const headerText = headerTextColor(team.colors.primary);
  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8 md:pb-20">
      <div className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#A90117]">Future assets</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Draft picks</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#000B36]/52 md:text-base">
          Current 2027 and 2028 draft-pick inventory for the {team.name}. Pick ownership will update here when trades are completed.
        </p>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {draftPickYears.map((year) => {
          const yearPicks = picks.filter((pick) => pick.year === year);
          return (
            <div key={year} className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-5" style={{ backgroundColor: team.colors.primary, color: headerText }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">AVHL Draft</p>
                  <h3 className="mt-1 text-3xl font-black">{year}</h3>
                </div>
                <span className="rounded-full border border-current bg-black/10 px-3 py-1.5 text-xs font-black">
                  {yearPicks.length} {yearPicks.length === 1 ? "pick" : "picks"}
                </span>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {yearPicks.map((pick) => {
                  const isOwnPick = pick.originalTeamSlug === team.slug;
                  return (
                    <div key={pick.id} className="rounded-2xl border border-[#000B36]/10 bg-[#F6F8FC] p-4">
                      <p className="text-lg font-black">{roundNames[pick.round] || `Round ${pick.round}`}</p>
                      <p className="mt-1 text-xs font-bold text-[#000B36]/48">
                        {isOwnPick ? "Own pick" : `via ${pick.originalTeam.name}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
