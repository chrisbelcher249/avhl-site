import assert from "node:assert/strict";
import { splitScheduleDateGroups, visibleScheduleDates, currentEasternDate } from "../src/lib/scheduleDateGroups.js";

const groups = [
  { date: "2026-09-30", games: [{id:1}] },
  { date: "2026-10-24", games: [{id:2},{id:3}] },
  { date: "2026-10-25", games: [{id:4}] },
  { date: "2026-10-26", games: [{id:5}] },
  { date: "2026-10-31", games: [{id:6}] },
  { date: "2026-11-01", games: [{id:7}] },
  { date: "2026-11-30", games: [{id:8}] },
  { date: "2026-12-01", games: [{id:9}] },
];
const october = splitScheduleDateGroups(groups,"2026-10-26");
assert.deepEqual(october.archiveSections.map(s=>s.monthKey),["2026-09","2026-10"]);
assert.deepEqual(october.archiveSections.map(s=>s.gameCount),[1,3]);
assert.deepEqual(october.archiveSections[1].groups.map(g=>g.date),["2026-10-24","2026-10-25"]);
assert.deepEqual(october.currentAndFutureGroups.map(g=>g.date),["2026-10-26","2026-10-31","2026-11-01","2026-11-30","2026-12-01"]);
const november = splitScheduleDateGroups(groups,"2026-11-01");
assert.deepEqual(november.archiveSections.map(s=>s.monthKey),["2026-09","2026-10"]);
assert.deepEqual(november.archiveSections[1].groups.map(g=>g.date),["2026-10-24","2026-10-25","2026-10-26","2026-10-31"]);
assert.equal(november.currentAndFutureGroups[0].date,"2026-11-01");
const nov2 = splitScheduleDateGroups(groups,"2026-11-02");
assert.deepEqual(nov2.archiveSections.map(s=>s.monthKey),["2026-09","2026-10","2026-11"]);
assert.deepEqual(nov2.archiveSections[2].groups.map(g=>g.date),["2026-11-01"]);
assert.equal(nov2.currentAndFutureGroups[0].date,"2026-11-30");
assert.equal(visibleScheduleDates(november.currentAndFutureGroups,"2026-11",2),14);
const manyDays = Array.from({length:30},(_,i)=>({date:`2026-11-${String(i+1).padStart(2,"0")}`,games:[{id:i+1}]}));
assert.equal(visibleScheduleDates(manyDays,"2026-11",14),30,
 "All dates in the chosen month must be visible on reload");
assert.equal(visibleScheduleDates(manyDays,"2026-12",30),30,
 "Load more should never reduce the visible date count");
const etLate = new Date("2026-11-01T03:59:00Z"); // Oct 31 at 11:59 EDT
const etMidnight = new Date("2026-11-01T04:00:00Z");
assert.equal(currentEasternDate(etLate),"2026-10-31");
assert.equal(currentEasternDate(etMidnight),"2026-11-01");
const winter = new Date("2027-01-01T04:59:00Z"); // Dec 31 at 11:59 EST
assert.equal(currentEasternDate(winter),"2026-12-31");
assert.equal(currentEasternDate(new Date("2027-01-01T05:00:00Z")),"2027-01-01");
assert.deepEqual(splitScheduleDateGroups(groups,"").archiveSections,[],
 "Missing league date must not prematurely archive games");
console.log("Major/Minor monthly archives, midnight ET and current-month pagination: PASS");
