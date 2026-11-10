import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const manifest = JSON.parse(fs.readFileSync("public/sim/headshots.json", "utf8"));
const source = fs.readFileSync("public/sim/headshots.js", "utf8");
const html = fs.readFileSync("public/sim/index.html", "utf8");
const app = fs.readFileSync("public/sim/app.js", "utf8");
const css = fs.readFileSync("public/sim/styles.css", "utf8");

const window = { location: { origin: "https://www.avhl.org" } };
const ctx = { window, URL, console };
vm.createContext(ctx);
vm.runInContext(source, ctx, { filename: "headshots.js" });
const photos = window.AVHL_HEADSHOTS;

assert.equal(manifest.version, 1);
assert.equal(Object.keys(manifest.players).length, 3);

const roster = JSON.parse(fs.readFileSync("data/headshot-roster-index.json", "utf8"));
assert.equal(roster.count, 1908, "portrait map must use the canonical AVHL roster");
const canonical = new Map(roster.players.map(p => [p.id, p]));
assert.equal(canonical.size, roster.count, "AVHL IDs must be unique");
for (const [id, entry] of Object.entries(manifest.playerIds || {})) {
  const player = canonical.get(id);
  assert.ok(player, `unknown photo player ID ${id}`);
  assert.equal(entry.name, player.name, `wrong name for photo player ID ${id}`);
  assert.equal(entry.birthdate, player.birth, `wrong birthdate for photo player ID ${id}`);
  assert.match(entry.license, /^CC (?:BY(?:-SA)?|0)(?: |$)/, `unsupported license for ${id}`);
  assert.ok(entry.author && entry.source && entry.licenseUrl, `missing photographer credit for ${id}`);
}
const covered = roster.players.filter(p => manifest.playerIds?.[p.id] || manifest.players[p.name]);
assert.equal(new Set(covered.map(p => p.id)).size, covered.length);
assert.ok(covered.length <= roster.count);
console.log(`AVHL headshot coverage: ${covered.length}/${roster.count} player IDs (${(100 * covered.length / roster.count).toFixed(1)}%).`);
assert.equal(photos.ingest(manifest), 3 + Object.keys(manifest.playerIds || {}).length, "all licensed photos should be accepted");
assert.ok(photos.lookup("LOGAN  THOMPSON"));
assert.ok(photos.lookup("Connor McDavid"));
assert.equal(photos.lookup("Someone Else"), null, "unknown players retain normal team logo");
assert.ok(photos.lookup("Logan Thompson").url.includes("commons.wikimedia.org"));
const sharedPhoto = manifest.players["Connor McDavid"];
photos.ingest({
  version: 1, players: {},
  playerIds: {
    "0099": { ...sharedPhoto, name: "Sebastian Aho" },
    "1175": { ...manifest.players["Logan Thompson"], name: "Sebastian Aho" }
  }
});
assert.notEqual(photos.lookup("Sebastian Aho", "0099").url, photos.lookup("Sebastian Aho", "1175").url, "namesake photos must respect AVHL IDs");
assert.equal(photos.lookup("Sebastian Aho", "0001"), null, "wrong ID must not assign a namesake portrait");
photos.ingest(manifest);


const sample = {
  version: 1,
  players: {
    "Bad Protocol": { url: "javascript:alert(1)", source: "https://commons.wikimedia.org/", author: "X", license: "CC", licenseUrl: "https://creativecommons.org/" },
    "Bad Host": { url: "https://arbitrary-example.net/image.png", source: "https://commons.wikimedia.org/", author: "X", license: "CC", licenseUrl: "https://creativecommons.org/" },
    "No Rights": { url: "https://commons.wikimedia.org/wiki/Special:FilePath/test.jpg", source: "https://commons.wikimedia.org/", author: "", license: "", licenseUrl: "" }
  }
};
assert.equal(photos.ingest(sample), 0, "untrusted or uncredited photos must be rejected");
photos.ingest(manifest);

const listeners = {};
const classes = new Set();
const tile = {
  dataset: { avhlPhotoName: "Logan Thompson" },
  classList: { contains: n => n === "event-player", add: n => classes.add(n), remove: n => classes.delete(n) },
  children: [], append(el) { this.children.push(el); }
};
ctx.document = {
  querySelectorAll: () => [tile],
  createElement: () => {
    const item = { addEventListener(event,fn) { listeners[event] = fn; }, remove(){this.removed = true;} };
    return item;
  }
};
photos.hydrate(ctx.document);
assert.equal(tile.children.length, 1);
assert.equal(tile.children[0].loading, "lazy");
assert.equal(tile.children[0].className, "event-headshot");
assert.equal(classes.has("has-headshot"), false, "image should not obscure fallback before load");
listeners.load();
assert.equal(classes.has("has-headshot"), true, "image replaces fallback only on successful load");
listeners.error();
assert.equal(classes.has("has-headshot"), false, "broken image falls back to existing team logo");
assert.equal(tile.children[0].removed, true);

assert.ok(html.includes("headshots.js?v=7.0.1-cc"));
assert.ok(html.includes("sim-photo-credits-list"));
assert.ok(app.includes("AVHL_HEADSHOTS?.load()"));
assert.ok(app.includes("AVHL_HEADSHOTS?.hydrate(row)"));
assert.ok(app.includes("AVHL_HEADSHOTS?.hydrate(elements.boxScoreContent)"));
assert.ok(css.includes(".event-player.has-headshot .event-headshot"));

console.log("Simulator licensed headshots: PASS (manifest, secure URLs, lazy load, failure fallback, feed and box score).");
