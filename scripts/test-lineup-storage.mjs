import fs from "node:fs/promises";
import path from "node:path";
import {
  getSavedLineup,
  getSavedLineups,
  lineupStorageStatus,
  saveLineupIfRevision,
} from "../src/lib/lineupStorage.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const devFile = path.join(process.cwd(), ".avhl-lineups.dev.json");
const priorNodeEnv = process.env.NODE_ENV;
const priorUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const priorUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const priorKvUrl = process.env.KV_REST_API_URL;
const priorKvToken = process.env.KV_REST_API_TOKEN;
const priorPrefixedUrl = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const priorPrefixedToken = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
const originalFetch = globalThis.fetch;

try {
  process.env.NODE_ENV = "development";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  await fs.rm(devFile, { force: true });

  assert(lineupStorageStatus().mode === "development-file", "Development storage mode was not selected.");

  const revision1 = { schema: "avhl-lineup-v1", abbreviation: "ARI", revision: 1, updatedAt: "2026-09-16T00:00:00.000Z" };
  const first = await saveLineupIfRevision("ARI", revision1, 0);
  assert(first.saved && first.currentRevision === 1, "Initial compare-and-save failed.");
  assert((await getSavedLineup("ARI"))?.revision === 1, "Initial saved revision could not be read back.");

  const stale = await saveLineupIfRevision("ARI", { ...revision1, revision: 1 }, 0);
  assert(!stale.saved && stale.currentRevision === 1, "Stale expected revision was not rejected.");

  const revision2 = { ...revision1, revision: 2, updatedAt: "2026-09-16T00:01:00.000Z" };
  const second = await saveLineupIfRevision("ARI", revision2, 1);
  assert(second.saved && second.currentRevision === 2, "Second compare-and-save failed.");
  const many = await getSavedLineups(["ARI", "ATL"]);
  assert(many.ARI?.revision === 2 && !many.ATL, "Multi-read did not preserve saved development data.");

  // Verify the Vercel Marketplace custom-prefix variables are recognized.
  process.env.NODE_ENV = "production";
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL = "https://prefixed.example.invalid";
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = "prefixed-test-token";
  assert(lineupStorageStatus().mode === "redis", "Vercel Marketplace prefixed Redis variables were not recognized.");
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

  // Verify the production Redis path emits one atomic EVAL rather than a GET
  // followed by SET. The fake response models a successful compare-and-save.
  process.env.NODE_ENV = "production";
  process.env.UPSTASH_REDIS_REST_URL = "https://example.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  let captured = null;
  globalThis.fetch = async (_url, options) => {
    captured = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      async json() { return { result: [1, 3] }; },
    };
  };
  const redisSave = await saveLineupIfRevision("CHI", { abbreviation: "CHI", revision: 3 }, 2);
  assert(redisSave.saved && redisSave.currentRevision === 3, "Redis compare-and-save success response was not handled.");
  assert(Array.isArray(captured) && captured[0] === "EVAL", "Redis save did not use EVAL.");
  assert(captured[2] === 1 && String(captured[3]).includes("CHI"), "Redis EVAL key arguments were malformed.");
  assert(String(captured[4]) === "2", "Redis EVAL expected revision argument was malformed.");

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    async json() { return { result: [0, 4] }; },
  });
  const conflict = await saveLineupIfRevision("CHI", { abbreviation: "CHI", revision: 3 }, 2);
  assert(!conflict.saved && conflict.currentRevision === 4, "Redis revision conflict was not surfaced.");

  console.log("Lineup storage: PASS (development CAS + atomic Redis EVAL command/conflict handling).");
} finally {
  await fs.rm(devFile, { force: true }).catch(() => {});
  globalThis.fetch = originalFetch;
  if (priorNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = priorNodeEnv;
  if (priorUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = priorUpstashUrl;
  if (priorUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = priorUpstashToken;
  if (priorKvUrl === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = priorKvUrl;
  if (priorKvToken === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = priorKvToken;
  if (priorPrefixedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_KV_REST_API_URL; else process.env.UPSTASH_REDIS_REST_KV_REST_API_URL = priorPrefixedUrl;
  if (priorPrefixedToken === undefined) delete process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN; else process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = priorPrefixedToken;
}
