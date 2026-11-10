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
assert.equal(photos.ingest(manifest), 3, "all three licensed photos should be accepted");
assert.ok(photos.lookup("LOGAN  THOMPSON"));
assert.ok(photos.lookup("Connor McDavid"));
assert.equal(photos.lookup("Someone Else"), null, "unknown players retain normal team logo");
assert.ok(photos.lookup("Logan Thompson").url.includes("commons.wikimedia.org"));

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
