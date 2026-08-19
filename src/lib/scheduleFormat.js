export function localDate(date) {
  return new Date(`${date}T12:00:00`);
}

export function formatScheduleDate(date, options = {}) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(localDate(date));
}

export function formatShortScheduleDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(localDate(date));
}

export function formatScheduleMonth(month) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-15T12:00:00`));
}

export function gameHasResult(game) {
  return Number.isFinite(game.awayScore) && Number.isFinite(game.homeScore);
}
