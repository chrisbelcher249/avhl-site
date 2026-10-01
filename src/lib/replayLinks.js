import { saturdayNightShowdowns } from "../../data/saturdayNightShowdowns";

const snsGameKeys = new Set(
  saturdayNightShowdowns.map((game) => `${game.date}|${game.away}|${game.home}`),
);

function safeExternalUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isSaturdayNightShowdown(game) {
  if (!game) return false;
  return snsGameKeys.has(`${game.date}|${game.away}|${game.home}`);
}

export function replayPresentationForGame(game, replayMetadata = {}) {
  const sheetUrl = safeExternalUrl(game?.replayUrl);
  if (sheetUrl) {
    return { available: true, url: sheetUrl, external: true };
  }

  // SNS games are played outside the simulator. If league operations has not
  // supplied a Replay URL in the Schedule sheet, do not show a replay button.
  if (isSaturdayNightShowdown(game)) {
    return { available: false, url: null, external: false };
  }

  const replay = replayMetadata[String(game?.id ?? "")] || null;
  if (!replay) return { available: false, url: null, external: false };

  const externalUrl = safeExternalUrl(replay.externalUrl);
  if (externalUrl) return { available: true, url: externalUrl, external: true };
  return { available: true, url: `/sim/replay/${game.id}`, external: false };
}
