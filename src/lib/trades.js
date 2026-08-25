import { teams } from "../../data/teams";

export const TRADE_SHEET_ID = "119E8yhrgkXwXbID0BUq-o2v0C7BqTmCMxbjhLc3uImc";
export const TRADE_SHEET_GID = "0";
export const TRADE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${TRADE_SHEET_ID}/export?format=csv&gid=${TRADE_SHEET_GID}`;

export const teamByAbbreviation = Object.fromEntries(teams.map((team) => [team.abbreviation, team]));

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
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeDate(value) {
  const trimmed = String(value || "").trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function numericTradeNumber(value, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getTrades() {
  try {
    const response = await fetch(TRADE_SHEET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);

    const csv = await response.text();
    const rows = parseCsv(csv);
    if (rows.length < 2) return { trades: [], error: null };

    const headers = rows[0].map((header) => header.trim());
    const indexOf = (name) => headers.indexOf(name);
    const tradeNumberIndex = indexOf("Trade #");
    const dateIndex = indexOf("Date");
    const teamAIndex = indexOf("Team A");
    const teamAReceivesIndex = indexOf("Team A Receives");
    const teamBIndex = indexOf("Team B");
    const teamBReceivesIndex = indexOf("Team B Receives");

    const required = [tradeNumberIndex, dateIndex, teamAIndex, teamAReceivesIndex, teamBIndex, teamBReceivesIndex];
    if (required.some((index) => index < 0)) {
      throw new Error("Trade sheet columns do not match the expected six-column format.");
    }

    const trades = rows.slice(1).map((row, index) => ({
      number: numericTradeNumber(row[tradeNumberIndex], index + 1),
      date: normalizeDate(row[dateIndex]),
      teamA: String(row[teamAIndex] || "").trim(),
      teamAReceives: String(row[teamAReceivesIndex] || "").trim(),
      teamB: String(row[teamBIndex] || "").trim(),
      teamBReceives: String(row[teamBReceivesIndex] || "").trim(),
    })).filter((trade) => trade.teamA && trade.teamB);

    trades.sort((a, b) => b.number - a.number);
    return { trades, error: null };
  } catch (error) {
    console.error("Unable to load AVHL trades", error);
    return {
      trades: [],
      error: "Trades are temporarily unavailable. The live Google Sheet must be shared for public viewing for this page to load.",
    };
  }
}
