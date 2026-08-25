import { teamByAbbreviation } from "../../data/teams";

export const DRAFT_PICK_SHEET_ID = "164tLcxUsyzzylju4QzVNpDL6Abt7OMGk0VZT29MUYW0";
export const DRAFT_PICK_SHEET_GID = "0";
export const DRAFT_PICK_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DRAFT_PICK_SHEET_ID}/export?format=csv&gid=${DRAFT_PICK_SHEET_GID}`;

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

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getDraftPicksForTeam(teamAbbreviation) {
  try {
    const response = await fetch(DRAFT_PICK_SHEET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);

    const csv = await response.text();
    const rows = parseCsv(csv);
    if (rows.length < 2) return { picks: [], error: null };

    const headers = rows[0].map((header) => String(header || "").trim());
    const indexOf = (name) => headers.indexOf(name);

    const pickIdIndex = indexOf("Pick ID");
    const yearIndex = indexOf("Year");
    const roundIndex = indexOf("Round");
    const originalTeamIndex = indexOf("Original Team");
    const originalTeamNameIndex = indexOf("Original Team Name");
    const currentOwnerIndex = indexOf("Current Owner");
    const currentOwnerNameIndex = indexOf("Current Owner Name");
    const timesTradedIndex = indexOf("Times Traded");
    const ownershipHistoryIndex = indexOf("Ownership History");

    const required = [pickIdIndex, yearIndex, roundIndex, originalTeamIndex, currentOwnerIndex];
    if (required.some((index) => index < 0)) {
      throw new Error("Draft-pick sheet columns do not match the expected format.");
    }

    const picks = rows.slice(1).map((row) => {
      const originalAbbreviation = String(row[originalTeamIndex] || "").trim();
      const ownerAbbreviation = String(row[currentOwnerIndex] || "").trim();
      const originalTeam = teamByAbbreviation[originalAbbreviation];
      const ownerTeam = teamByAbbreviation[ownerAbbreviation];

      return {
        id: String(row[pickIdIndex] || "").trim(),
        year: integer(row[yearIndex]),
        round: integer(row[roundIndex]),
        originalTeamAbbreviation: originalAbbreviation,
        originalTeamSlug: originalTeam?.slug || "",
        originalTeam: originalTeam || {
          name: String(row[originalTeamNameIndex] || originalAbbreviation).trim(),
          abbreviation: originalAbbreviation,
          slug: "",
        },
        ownerAbbreviation,
        ownerTeam: ownerTeam || {
          name: String(row[currentOwnerNameIndex] || ownerAbbreviation).trim(),
          abbreviation: ownerAbbreviation,
          slug: "",
        },
        timesTraded: integer(row[timesTradedIndex]),
        ownershipHistory: String(row[ownershipHistoryIndex] || originalAbbreviation).trim(),
      };
    }).filter((pick) => pick.id && pick.ownerAbbreviation === teamAbbreviation);

    picks.sort((a, b) =>
      a.year - b.year ||
      a.round - b.round ||
      a.originalTeam.name.localeCompare(b.originalTeam.name)
    );

    return { picks, error: null };
  } catch (error) {
    console.error("Unable to load AVHL draft picks", error);
    return {
      picks: [],
      error: "Draft picks are temporarily unavailable. The live Google Sheet must be shared for public viewing for this section to load.",
    };
  }
}
