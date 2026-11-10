import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const output=execFileSync(process.execPath,[
  "scripts/precompute-v7-odds.mjs","--away","ARI","--home","ATL",
  "--target","2","--fixture","--dry-run"
],{encoding:"utf8",timeout:45000});
const lines=output.trim().split("\n");
const result=JSON.parse(lines[lines.length-1]);
assert.equal(result.smoke,"PASS");
assert.equal(result.samples,2);
assert.equal(result.scores.length,2);
console.log("Exact V7 precompute runner: PASS (CLI parsing, full-game smoke and safe dry-run).");
