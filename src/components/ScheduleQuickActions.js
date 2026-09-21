"use client";

import Link from "next/link";

export default function ScheduleQuickActions({ hasToday = false }) {
  function showSaturdayNightShowdowns() {
    window.dispatchEvent(new Event("avhl:schedule:sns"));
  }

  function showToday() {
    window.dispatchEvent(new Event("avhl:schedule:today"));
  }

  const baseClass = "w-fit rounded-full border border-[#000B36]/14 bg-white px-6 py-3 text-sm font-black uppercase tracking-wide transition hover:border-[#18BDFC] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#000B36]/14";

  return (
    <div className="flex flex-wrap gap-3 lg:justify-end">
      <Link href="/teams" className={baseClass}>Browse teams</Link>
      <button type="button" onClick={showSaturdayNightShowdowns} className={baseClass}>SNS games</button>
      <button type="button" onClick={showToday} disabled={!hasToday} className={baseClass}>Today&apos;s games</button>
    </div>
  );
}
