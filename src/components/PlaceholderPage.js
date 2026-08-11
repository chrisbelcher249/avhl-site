import Link from "next/link";

export default function PlaceholderPage({ eyebrow, title, description, items = [] }) {
  return (
    <main className="bg-[#F6F8FC] px-6 py-14 text-[#000B36] md:px-8 md:py-20">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#A90117]">{eyebrow}</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#000B36]/60">{description}</p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-[#000B36]/10 bg-white p-7 shadow-[0_10px_40px_rgba(0,11,54,0.06)] md:p-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#000B36]/40">2026–27 build status</p>
              <h2 className="mt-2 text-3xl font-black">The structure is ready.</h2>
              <p className="mt-3 leading-7 text-[#000B36]/58">
                This section is intentionally prepared for live season data rather than filled with invented numbers. The site can plug standings, schedules, statistics, and historical records into this layout as those datasets are added.
              </p>
            </div>
            <Link href="/teams" className="inline-flex shrink-0 justify-center rounded-full bg-[#000B36] px-6 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-[#00145C]">
              Browse teams
            </Link>
          </div>

          {items.length > 0 && (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {items.map(([heading, copy]) => (
                <div key={heading} className="rounded-2xl bg-[#F6F8FC] p-5">
                  <h3 className="text-lg font-black">{heading}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#000B36]/55">{copy}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
