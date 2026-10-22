import assert from "node:assert/strict";
import { observeSnsReplayLinks } from "../src/lib/snsReplayTracking.js";
import { replayPresentationForGame } from "../src/lib/replayLinks.js";

process.env.UPSTASH_REDIS_REST_URL = "https://mock-upstash.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-only";

const store = new Map();
const key = "avhl:sns-replay-first-seen:v1";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, init) => {
  const [command, hash, field, value] = JSON.parse(init.body);
  assert.equal(hash, key);
  let result;
  switch (command) {
    case "HGETALL": result = [...store.entries()].flat(); break;
    case "HGET": result = store.get(field) ?? null; break;
    case "HSETNX":
      result = store.has(field) ? 0 : 1;
      if (result) store.set(field, value);
      break;
    case "HSET": store.set(field, value); result = 1; break;
    case "HDEL": result = Number(store.delete(field)); break;
    default: throw new Error("Unexpected Redis command: " + command);
  }
  return { ok: true, json: async () => ({ result }) };
};

try {
  const game = {
    id: 52, date: "2026-10-24",
    away: "detroit-motors", home: "richmond-robbers",
    replayUrl: "https://www.youtube.com/watch?v=example1",
  };
  const first = await observeSnsReplayLinks([game]);
  assert.equal(store.size, 1);
  assert.equal(replayPresentationForGame(game, {}, first).available, true);
  const seen = first["52"].firstSeenAt;
  const second = await observeSnsReplayLinks([game]);
  assert.equal(second["52"].firstSeenAt, seen, "Revisiting must not restart seven-day window");

  const expired = { "52": { url: game.replayUrl, firstSeenAt: new Date(Date.now() - 8*86400000).toISOString() } };
  assert.equal(replayPresentationForGame(game, {}, expired).available, false, "Old SNS links should hide");
  assert.equal(replayPresentationForGame(game, {}, {}).available, false, "Untracked SNS links should hide");

  store.set("52", JSON.stringify(expired["52"]));
  assert.equal(replayPresentationForGame(game, {}, await observeSnsReplayLinks([game])).available, false);

  const changed = { ...game, replayUrl: "https://www.youtube.com/watch?v=example2" };
  const updated = await observeSnsReplayLinks([changed]);
  assert.equal(updated["52"].url, changed.replayUrl);
  assert.equal(replayPresentationForGame(changed, {}, updated).available, true, "Replacing link restarts the clock");
  assert.equal(replayPresentationForGame(game, {}, updated).available, false, "Old URL should not reappear");

  await observeSnsReplayLinks([{ ...game, replayUrl: "" }]);
  assert.equal(store.size, 0, "Removing the link resets tracking");
  assert.equal(replayPresentationForGame(changed, {}, await observeSnsReplayLinks([changed])).available, true);

  const legacyGame = {
    id: 108, date: "2026-10-03",
    away: "florida-sunshine", home: "charleston-tsunami",
    replayUrl: "https://www.youtube.com/watch?v=oldSNS",
  };
  const priorToRollout = {
    "108": { url: legacyGame.replayUrl, firstSeenAt: "2026-10-22T17:10:00.000Z" },
  };
  assert.equal(replayPresentationForGame(legacyGame, {}, priorToRollout).available, false,
    "An already-existing October 3 SNS link must not receive a new seven-day clock on rollout");

  const laterAddition = {
    "108": { url: legacyGame.replayUrl, firstSeenAt: "2026-10-22T17:30:00.000Z" },
  };
  assert.equal(replayPresentationForGame(legacyGame, {}, laterAddition).available, true,
    "SNS links genuinely added after rollout still receive seven days from observation");

  const other = { ...game, id: 31, date: "2026-09-20", replayUrl: "https://example.com/other" };
  assert.equal(replayPresentationForGame(other, {}, {}).available, true, "Ordinary external URLs remain unchanged");

  assert.equal(game.replayUrl, "https://www.youtube.com/watch?v=example1", "No Sheet data was modified");
  console.log("SNS seven-day replay link tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
