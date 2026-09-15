import { teams as fallbackTeams } from "../../data/teams";

export const TEAM_BRANDING_SHEET_ID = "1wi3Flw2LkO39wZH2MtaKGjfePbBsXoiLQDjfUYT0Ef4";
export const TEAM_BRANDING_SHEET_GID = "0";
export const TEAM_BRANDING_SHEET_URL = `https://docs.google.com/spreadsheets/d/${TEAM_BRANDING_SHEET_ID}/export?format=csv&gid=${TEAM_BRANDING_SHEET_GID}`;

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
      if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => String(cell).trim() !== "")) rows.push(row);
  return rows;
}

function clean(value) {
  const text = String(value ?? "").trim();
  if (!text || /^n\/?a$/i.test(text)) return "";
  return text;
}

function rgbToHex(value) {
  const text = clean(value);
  if (!text) return "";
  const hexMatch = text.match(/^#?([0-9a-f]{6})$/i);
  if (hexMatch) return `#${hexMatch[1].toUpperCase()}`;

  const rgbMatch = text.match(/^\(?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/);
  if (!rgbMatch) return "";
  const channels = rgbMatch.slice(1).map((part) => Math.max(0, Math.min(255, Number(part))));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function rowObject(headers, row) {
  const object = {};
  headers.forEach((header, index) => {
    if (header && object[header] === undefined) object[header] = row[index] ?? "";
  });
  return object;
}

function mergeTeam(base, row) {
  if (!row) return { ...base };

  const city = clean(row["City/Location"]) || base.city;
  const nickname = clean(row["Team Nickname"]) || clean(row["Team Name"]) || base.nickname;
  const fullName = city && nickname ? `${city} ${nickname}` : base.name;
  const primary = rgbToHex(row["Hex 1"]) || rgbToHex(row["Team Color 1"]) || base.colors.primary;
  const secondary = rgbToHex(row["Hex 2"]) || rgbToHex(row["Team Color 2"]) || base.colors.secondary;
  const tertiary = rgbToHex(row["Hex 3"]) || rgbToHex(row["Team Color 3"]) || base.colors.tertiary;

  return {
    ...base,
    name: fullName,
    city,
    nickname,
    playByPlayName: clean(row["Play by Play Team Name"]) || base.playByPlayName,
    arena: clean(row["Arena Name"]) || base.arena,
    mascot: {
      ...base.mascot,
      name: clean(row["Mascot Name"]) || base.mascot?.name || "",
      number: clean(row["Mascot #"]) || base.mascot?.number || "",
    },
    presentation: {
      ...base.presentation,
      goalHorn: clean(row["Goal Horn"]) || base.presentation?.goalHorn || "",
      goalSong: clean(row["Goal Song"]) || base.presentation?.goalSong || "",
      powerplaySong: clean(row["Powerplay Song"]) || base.presentation?.powerplaySong || "",
      powerplayPresentation: clean(row["Powerplay Pres."]) || base.presentation?.powerplayPresentation || "",
      winSong: clean(row["Win Song"]) || base.presentation?.winSong || "",
      winPresentation: clean(row["Win Presentation"]) || base.presentation?.winPresentation || "",
      rinkAnnouncer: clean(row["Rink Announcer"]) || base.presentation?.rinkAnnouncer || "",
    },
    colors: {
      ...base.colors,
      primary,
      primaryName: clean(row["Color 1"]) || base.colors.primaryName,
      secondary,
      secondaryName: clean(row["Color 2"]) || base.colors.secondaryName,
      tertiary,
      tertiaryName: clean(row["Color 3"]) || base.colors.tertiaryName,
    },
  };
}

export async function getTeams() {
  try {
    const response = await fetch(TEAM_BRANDING_SHEET_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);

    const csv = await response.text();
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error("Team branding sheet did not contain team rows");

    const headers = rows[0].map((header) => clean(header));
    const abbreviationIndex = headers.indexOf("Abbreviation");
    if (abbreviationIndex < 0) throw new Error("Team branding sheet is missing Abbreviation");

    const liveByAbbreviation = new Map();
    for (const row of rows.slice(1)) {
      const abbreviation = clean(row[abbreviationIndex]).toUpperCase();
      if (!abbreviation) continue;
      liveByAbbreviation.set(abbreviation, rowObject(headers, row));
    }

    const teams = fallbackTeams.map((team) => mergeTeam(team, liveByAbbreviation.get(team.abbreviation)));
    return {
      teams,
      source: "live",
      liveTeamCount: liveByAbbreviation.size,
    };
  } catch (error) {
    console.error("Unable to load live team branding; using bundled team data.", error);
    return {
      teams: fallbackTeams,
      source: "fallback",
      liveTeamCount: 0,
    };
  }
}

export async function getTeamBySlug(slug) {
  const { teams, source, liveTeamCount } = await getTeams();
  return {
    team: teams.find((candidate) => candidate.slug === slug) ?? null,
    teams,
    source,
    liveTeamCount,
  };
}
