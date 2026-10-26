// Schedule dates are ISO YYYY-MM-DD, so lexical comparisons are chronological.
export function currentEasternDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function splitScheduleDateGroups(groups, todayDate) {
  const history = new Map();
  const upcoming = [];
  for (const group of groups) {
    if (todayDate && group.date < todayDate) {
      const monthKey = group.date.slice(0, 7);
      if (!history.has(monthKey)) history.set(monthKey, []);
      history.get(monthKey).push(group);
    } else upcoming.push(group);
  }
  return {
    archiveSections: [...history.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([monthKey, pastGroups]) => ({
      monthKey,
      groups: pastGroups,
      gameCount: pastGroups.reduce((sum, group) => sum + group.games.length, 0),
    })),
    currentAndFutureGroups: upcoming,
  };
}

export function visibleScheduleDates(groups, selectedMonth, count, initialCount = 14) {
  const monthCount = groups.filter((group) => group.date.slice(0, 7) === selectedMonth).length;
  return Math.max(initialCount, count, monthCount);
}
