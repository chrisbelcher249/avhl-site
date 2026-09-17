export const SEASON_SHEET_ID = "1oE_GTm72iMRlTAZBZTBw305vBWnGUeJfY7_fGvcWr5M";

export const SEASON_TABS = Object.freeze({
  schedule: "Schedule",
  teamStats: "Team Stats",
  skaterStats: "Skater Stats",
  goalieStats: "Goalie Stats",
});

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => String(cell ?? "").trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => String(cell ?? "").trim() !== "")) rows.push(row);
  return rows;
}

function cleanHeader(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim().replace(/\s+/g, " ");
}

function findHeaderRow(rows) {
  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const headers = rows[index].map(cleanHeader);
    if (headers.includes("Game ID")) return { index, headers };
  }
  return null;
}

export function csvToObjects(csv) {
  const rows = parseCsv(csv);
  const header = findHeaderRow(rows);
  if (!header) throw new Error("Sheet is missing a Game ID header row");
  return rows.slice(header.index + 1).map((row) => {
    const object = {};
    header.headers.forEach((name, index) => { if (name) object[name] = row[index] ?? ""; });
    return object;
  }).filter((row) => String(row["Game ID"] ?? "").trim() !== "");
}

function csvCandidates(tabName) {
  const id = process.env.AVHL_SEASON_SHEET_ID || SEASON_SHEET_ID;
  const encoded = encodeURIComponent(tabName);
  const bust = Date.now();
  const base = `https://docs.google.com/spreadsheets/d/${id}`;
  return [
    `${base}/gviz/tq?tqx=out:csv&sheet=${encoded}&_=${bust}`,
    `${base}/export?format=csv&sheet=${encoded}&_=${bust}`,
  ];
}

export async function fetchSeasonSheet(tabName) {
  const errors = [];
  for (const url of csvCandidates(tabName)) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "AVHL/1.0 (+https://avhl.org)",
        },
      });
      if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
      return { rows: csvToObjects(await response.text()), source: "live", error: null };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`${tabName} could not be loaded from the season workbook. ${errors.join(" | ")}`);
}

export function normalizePlayerId(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? digits.padStart(4, "0").slice(-4) : "";
}

export function integer(value, fallback = 0) {
  const number = Number.parseInt(String(value ?? "").replace(/,/g, "").trim(), 10);
  return Number.isFinite(number) ? number : fallback;
}

export function numberValue(value, fallback = 0) {
  const text = String(value ?? "").replace(/,/g, "").trim();
  if (!text) return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
}

export function percentageValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  if (text.endsWith("%")) {
    const number = Number(text.slice(0, -1));
    return Number.isFinite(number) ? number / 100 : 0;
  }
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

export function timeToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return 0;
  if (!text.includes(":")) {
    const number = Number(text);
    return Number.isFinite(number) ? number : 0;
  }
  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

export function secondsToClock(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function isoDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return text;
  let [, month, day, year] = match;
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
