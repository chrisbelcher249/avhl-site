import { playerCounts as fallbackCounts, players as fallbackPlayers } from "../../data/players";

export const PLAYER_SHEET_ID = "1TK2gNvYwXGb_eoVyITBjsgVqZ5m6QnQje6qQtZtxv64";

const SKATER_SHEET_NAMES = [
  "Skaters",
  "AVHL 2026-27 Player Ratings - Skaters",
  "AVHL 2026-27 Player Ratings - Skaters (10)",
  "AVHL 2026-27 Player Ratings - Skaters (11)",
  "AVHL 2026-27 Player Ratings - Skaters (12)",
  "AVHL 2026-27 Player Ratings - Skaters (13)",
];

const SKATER_URLS = [
  `https://docs.google.com/spreadsheets/d/${PLAYER_SHEET_ID}/export?format=csv&gid=0`,
  ...SKATER_SHEET_NAMES.map(
    (name) => `https://docs.google.com/spreadsheets/d/${PLAYER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`,
  ),
];

const GOALIE_SHEET_NAMES = [
  "Goalies",
  "Goalie",
  "Goalie Ratings",
  "Goalies (10)",
  "AVHL 2026-27 Player Ratings - Goalies",
  "AVHL 2026-27 Player Ratings - Goalies (10)",
  "AVHL 2026-27 Player Ratings - Goalies (11)",
  "AVHL 2026-27 Player Ratings - Goalies (12)",
  "AVHL 2026-27 Player Ratings - Goalies (13)",
  "AVHL 2026-27 Player Ratings - Goalies (14)",
];

const GOALIE_URLS = GOALIE_SHEET_NAMES.map(
  (name) => `https://docs.google.com/spreadsheets/d/${PLAYER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`,
);

function parseCsv(text) {
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

function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => String(value || "").trim());
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function number(value, decimal = false) {
  const text = String(value ?? "").trim();
  if (!text || text.toUpperCase() === "N/A") return null;
  const parsed = decimal ? Number.parseFloat(text) : Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value) {
  const text = String(value ?? "").replace(/[$,]/g, "").trim();
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function isoDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return text;
}

function skater(row) {
  return {
    id: String(row["AVHL ID"] || "").padStart(4, "0"),
    name: String(row["Full Name"] || "").trim(),
    currentTeam: String(row["Current Team"] || "").trim() || "UFA",
    yearsLeft: number(row["Years Left"]),
    aav: money(row.AAV),
    overall: number(row["Overall Rating"]),
    birthdate: isoDate(row.Birthdate),
    number: number(row["Jersey #"]),
    position: String(row["Position(s)"] || "").trim(),
    height: String(row.Height || "").trim(),
    weight: number(row.Weight),
    age: number(row.Age),
    handedness: String(row.Shot || "").trim(),
    playerType: String(row["Player Type"] || "").trim(),
    league: String(row.League || "").trim(),
    proTeam: String(row.Team || "").trim(),
    role: "Skater",
    season: {
      g: number(row["25-26 G"]),
      a: number(row["25-26 A"]),
      pts: number(row["25-26 P"]),
    },
    career: {
      g: number(row["Total G"]),
      a: number(row["Total A"]),
      pts: number(row["Total PTS"]),
    },
    ratings: {
      Deking: number(row.Deking),
      "Hand Eye": number(row["Hand Eye"]),
      Passing: number(row.Passing),
      "Puck Control": number(row["Puck Control"]),
      Discipline: number(row.Discipline),
      "Off. Awareness": number(row["Off. Awareness"]),
      Poise: number(row.Poise),
      "Slap Shot Accuracy": number(row["Slap Shot Accuracy"]),
      "Slap Shot Power": number(row["Slap Shot Power"]),
      "Wrist Shot Accuracy": number(row["Wrist Shot Accuracy"]),
      "Wrist Shot Acc.": number(row["Wrist Shot Accuracy"]),
      "Wrist Shot Power": number(row["Wrist Shot Power"]),
      "Def. Awareness": number(row["Def. Awareness"]),
      Faceoffs: number(row.Faceoffs),
      "Shot Blocking": number(row["Shot Blocking"]),
      "Stick Checking": number(row["Stick Checking"]),
      Acceleration: number(row.Acceleration),
      Agility: number(row.Agility),
      Balance: number(row.Balance),
      Endurance: number(row.Endurance),
      Speed: number(row.Speed),
      Aggressiveness: number(row.Aggressiveness),
      "Body Checking": number(row["Body Checking"]),
      Durability: number(row.Durability),
      "Fighting Skill": number(row["Fighting Skill"]),
      Strength: number(row.Strength),
    },
  };
}

function goalie(row) {
  return {
    id: String(row["AVHL ID"] || "").padStart(4, "0"),
    name: String(row["Full Name"] || "").trim(),
    currentTeam: String(row["Current Team"] || "").trim() || "UFA",
    yearsLeft: number(row["Years Left"]),
    aav: money(row.AAV),
    overall: number(row["Overall Rating"]),
    birthdate: isoDate(row.Birthdate),
    number: number(row["Jersey #"]),
    position: "G",
    height: String(row.Height || "").trim(),
    weight: number(row.Weight),
    age: number(row.Age),
    handedness: String(row.Glove || "").trim(),
    playerType: "Goalie",
    league: String(row.League || "").trim(),
    proTeam: String(row.Team || "").trim(),
    role: "Goalie",
    season: {
      sa: number(row["25-26 SA"]),
      sv: number(row["25-26 SV"]),
      svPct: number(row["25-26 SV%"], true),
    },
    career: {
      sa: number(row["Total SA"]),
      sv: number(row["Total SV"]),
      svPct: number(row["Career SV%"], true),
    },
    ratings: {
      Angles: number(row.Angles),
      Breakaway: number(row.Breakaway),
      "Five Hole": number(row["Five Hole"]),
      "Glove High": number(row["Glove High"]),
      "Glove Low": number(row["Glove Low"]),
      "Stick High": number(row["Stick High"]),
      "Stick Low": number(row["Stick Low"]),
      Passing: number(row.Passing),
      Poise: number(row.Poise),
      "Poke Check": number(row["Poke Check"]),
      "Puck Playing Freq.": number(row["Puck Playing Freq."]),
      "Rebound Control": number(row["Rebound Control"]),
      Recover: number(row.Recover),
      Aggressiveness: number(row.Aggressiveness),
      Agility: number(row.Agility),
      Durability: number(row.Durability),
      Endurance: number(row.Endurance),
      Speed: number(row.Speed),
      Vision: number(row.Vision),
    },
  };
}

async function fetchRows(urls, requiredHeader) {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);
      const text = await response.text();
      const rows = parseCsv(text);
      const headers = rows[0] || [];
      if (!headers.includes("AVHL ID") || !headers.includes(requiredHeader)) {
        throw new Error(`Sheet did not contain ${requiredHeader}`);
      }
      return rowsToObjects(rows).filter((row) => String(row["AVHL ID"] || "").trim());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Unable to load Google Sheet tab");
}

function countsFor(players) {
  const goalies = players.filter((player) => player.role === "Goalie").length;
  const rostered = players.filter((player) => player.currentTeam !== "UFA").length;
  return {
    total: players.length,
    skaters: players.length - goalies,
    goalies,
    ufa: players.length - rostered,
    rostered,
  };
}

export async function getPlayers() {
  const fallbackSkaters = fallbackPlayers.filter((player) => player.role === "Skater");
  const fallbackGoalies = fallbackPlayers.filter((player) => player.role === "Goalie");
  const [skaterResult, goalieResult] = await Promise.allSettled([
    fetchRows(SKATER_URLS, "25-26 P"),
    fetchRows(GOALIE_URLS, "25-26 SV%"),
  ]);

  const liveSkaters = skaterResult.status === "fulfilled"
    ? skaterResult.value.map(skater).filter((player) => player.name)
    : null;
  const liveGoalies = goalieResult.status === "fulfilled"
    ? goalieResult.value.map(goalie).filter((player) => player.name)
    : null;

  if (skaterResult.status === "rejected") {
    console.error("Unable to load live skater database; using bundled fallback", skaterResult.reason);
  }
  if (goalieResult.status === "rejected") {
    console.error("Unable to load live goalie database; using bundled fallback", goalieResult.reason);
  }

  const players = [...(liveSkaters || fallbackSkaters), ...(liveGoalies || fallbackGoalies)];
  return {
    players,
    playerCounts: countsFor(players),
    source: liveSkaters && liveGoalies ? "live" : liveSkaters || liveGoalies ? "partial" : "fallback",
    fallbackCounts,
  };
}
