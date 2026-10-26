"use client";

import { formatScheduleMonth } from "@/lib/scheduleFormat";

export default function ScheduleArchiveMonth({ section, currentMonth, expanded, onToggle, renderDateGroup }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#000B36]/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(section.monthKey)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left transition hover:bg-[#F8FAFD] md:px-7"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#A90117]">
            {section.monthKey === currentMonth ? "Current month" : "Previous month"}
          </p>
          <h3 className="mt-1 text-2xl font-black md:text-3xl">{formatScheduleMonth(section.monthKey)}</h3>
          <p className="mt-1 text-xs font-bold text-[#000B36]/40">
            {section.gameCount} past games · {section.groups.length} dates
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F4F9] text-xl font-black text-[#000B36]" aria-hidden="true">
          {expanded ? "⌃" : "⌄"}
        </span>
      </button>
      {expanded ? (
        <div className="space-y-10 border-t border-[#000B36]/8 px-5 py-7 md:px-7">
          {section.groups.map(renderDateGroup)}
        </div>
      ) : null}
    </section>
  );
}
