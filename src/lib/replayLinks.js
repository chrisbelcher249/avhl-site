import { saturdayNightShowdowns } from "../../data/saturdayNightShowdowns.js";
import { officialReplayIsExpired } from "./replayRetention.js";

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

const SNS_REPLAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Before SNS link tracking existed, the Schedule sheet did not record when
// each YouTube URL was added. For the URLs already observed by rollout on
// October 22, use the scheduled game date as a conservative one-time proxy.
// New URLs first seen after rollout always get their own seven-day window.
const LEGACY_SNS_ROLLOUT_CUTOFF = Date.parse("2026-10-22T17:20:00.000Z");
const LEGACY_SNS_GAME_DATE_CUTOFF = "2026-10-22";

function wasLegacySnsLink(game, firstSeenAt) {
  return game?.date < LEGACY_SNS_GAME_DATE_CUTOFF &&
    firstSeenAt <= LEGACY_SNS_ROLLOUT_CUTOFF;
}

function hasLegacySnsGameExpired(game, now) {
  const dayEnd = Date.parse(`${game.date}T23:59:59.999Z`);
  return Number.isFinite(dayEnd) && now >= dayEnd + SNS_REPLAY_WINDOW_MS;
}

export function replayPresentationForGame(game, replayMetadata = {}, snsReplayLinks = {}) {
  const sheetUrl = safeExternalUrl(game?.replayUrl);
  if (sheetUrl) {
    if (isSaturdayNightShowdown(game)) {
      const seen = snsReplayLinks[String(game.id)];
      const observedAt = Date.parse(seen?.firstSeenAt || "");
      // Missing tracking data must never make an expired SNS replay reappear.
      const now = Date.now();
      if (seen?.url !== sheetUrl || !Number.isFinite(observedAt) ||
          now >= observedAt + SNS_REPLAY_WINDOW_MS ||
          (wasLegacySnsLink(game, observedAt) && hasLegacySnsGameExpired(game, now))) {
        return { available: false, url: null, external: false };
      }
    }
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
  if (officialReplayIsExpired(replay)) return { available: false, url: null, external: false };
  return { available: true, url: `/sim/replay/${game.id}`, external: false };
}
