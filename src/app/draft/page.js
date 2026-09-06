const SHEET_ID = "164tLcxUsyzzylju4QzVNpDL6Abt7OMGk0VZT29MUYW0";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=sharing`;
const EMBED_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/preview?rm=minimal`;

export const metadata = {
  title: "Draft Capital",
  description: "Live AVHL draft-pick ownership and draft capital for every Major League team.",
};

export default function DraftPage() {
  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative overflow-hidden bg-[#000B36] px-6 py-14 text-white md:px-8 md:py-20">
        <div className="absolute inset-0 opacity-90 [background-image:radial-gradient(circle_at_84%_18%,rgba(24,189,252,0.24),transparent_28%),radial-gradient(circle_at_12%_95%,rgba(169,1,23,0.34),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">2026–27 League Assets</p>
          <div className="mt-3 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-5xl font-black tracking-tight md:text-7xl">Draft Capital</h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/65 md:text-lg">
                Live draft-pick ownership for every AVHL Major League club. This board is linked directly to the league&apos;s master draft-pick sheet and updates with it.
              </p>
            </div>
            <a
              href={SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 bg-white px-5 py-3 text-sm font-black text-[#000B36] transition hover:bg-cyan-100"
            >
              Open in Google Sheets
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-3 py-8 sm:px-5 md:px-8 md:py-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#A90117]">Live league sheet</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">Current pick ownership</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#000B36]/45">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Updates with the master sheet
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[#000B36]/10 bg-white shadow-sm md:rounded-[2rem]">
          <iframe
            src={EMBED_URL}
            title="AVHL live draft pick ownership"
            className="block h-[72vh] min-h-[680px] w-full border-0 bg-white md:h-[78vh]"
            loading="lazy"
            allowFullScreen
          />
        </div>

        <p className="mt-4 px-1 text-xs font-semibold leading-5 text-[#000B36]/42">
          If the embedded board does not load because of browser or Google account restrictions, use “Open in Google Sheets” above to view the same live data directly.
        </p>
      </section>
    </main>
  );
}
