import { teams as fallbackTeams } from "../../data/teams";

export const TEAM_BRANDING_SHEET_ID = "1wi3Flw2LkO39wZH2MtaKGjfePbBsXoiLQDjfUYT0Ef4";

// Google has more than one anonymous CSV endpoint. The Visualization endpoint
// is the most reliable for public/view-only sheets on serverless hosts; the
// export endpoints stay as fallbacks in case Google changes behavior.
function sheetCsvCandidates() {
  const bust = Date.now();
  const base = `https://docs.google.com/spreadsheets/d/${TEAM_BRANDING_SHEET_ID}`;
  return [
    {
      name: "google-gviz",
      url: `${base}/gviz/tq?tqx=out:csv&_=${bust}`,
    },
    {
      name: "google-gviz-gid-0",
      url: `${base}/gviz/tq?tqx=out:csv&gid=0&_=${bust}`,
    },
    {
      name: "google-export",
      url: `${base}/export?format=csv&_=${bust}`,
    },
    {
      name: "google-export-gid-0",
      url: `${base}/export?format=csv&gid=0&_=${bust}`,
    },
  ];
}

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
  const text = String(value ?? "").replace(/^\uFEFF/, "").trim();
  if (!text || /^n\/?a$/i.test(text)) return "";
  return text;
}


function normalizeHashtag(value) {
  const text = clean(value).replace(/\s+/g, "");
  if (!text) return "";
  return text.startsWith("#") ? text : `#${text}`;
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

function normalizeHeader(value) {
  return clean(value).replace(/\s+/g, " ");
}

function rowObject(headers, row) {
  const object = {};
  headers.forEach((header, index) => {
    if (header && object[header] === undefined) object[header] = row[index] ?? "";
  });

  // Be tolerant of small Team Specs header wording changes such as
  // "Hashtag", "Team Hashtags", or "Official Team Hashtag".
  const hashtagIndex = headers.findIndex((header) => /hash\s*tags?/i.test(header));
  object.__hashtagCandidate = hashtagIndex >= 0 ? row[hashtagIndex] ?? "" : "";

  // The current live Team Specs source keeps the official hashtag as the
  // second column from the right. Preserve the position as a final fallback.
  object.__secondFromRightHeader = headers.length >= 2 ? headers[headers.length - 2] ?? "" : "";
  object.__secondFromRight = headers.length >= 2 ? row[headers.length - 2] ?? "" : "";
  return object;
}

function liveHashtag(row) {
  const explicit =
    row["Hashtag"] ||
    row["Team Hashtag"] ||
    row["Official Hashtag"] ||
    row["Official Team Hashtag"] ||
    row["Social Hashtag"] ||
    row["Social Media Hashtag"] ||
    row.__hashtagCandidate;

  if (clean(explicit)) return explicit;

  // Team Specs keeps the official team hashtag in the second column from
  // the right. Treat that position as authoritative when a named hashtag
  // header is unavailable. The values do not have to include a leading #;
  // normalizeHashtag() adds it later.
  const positionalValue = clean(row.__secondFromRight);
  if (positionalValue) return positionalValue;

  return "";
}

function findHeaderRow(rows) {
  // Do not assume row 1 forever. This also survives a title/notes row being
  // inserted above the table in Google Sheets later.
  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    const headers = rows[index].map(normalizeHeader);
    if (headers.includes("Abbreviation") && headers.includes("Arena Name")) {
      return { index, headers };
    }
  }
  return null;
}

function parseLiveTeams(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("Team branding sheet did not contain team rows");

  const header = findHeaderRow(rows);
  if (!header) throw new Error("Team branding sheet is missing the expected header row");

  const abbreviationIndex = header.headers.indexOf("Abbreviation");
  const liveByAbbreviation = new Map();

  for (const row of rows.slice(header.index + 1)) {
    const abbreviation = clean(row[abbreviationIndex]).toUpperCase();
    if (!abbreviation) continue;
    liveByAbbreviation.set(abbreviation, rowObject(header.headers, row));
  }

  // A successful response that somehow contains only a few teams is worse
  // than falling back; reject it so another Google endpoint can be tried.
  if (liveByAbbreviation.size < 35) {
    throw new Error(`Only ${liveByAbbreviation.size} team rows were found`);
  }

  return liveByAbbreviation;
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
    hashtag: normalizeHashtag(liveHashtag(row)) || base.hashtag || "",
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

async function fetchLiveSheet() {
  const errors = [];

  for (const candidate of sheetCsvCandidates()) {
    try {
      const response = await fetch(candidate.url, {
        cache: "no-store",
        redirect: "follow",
        headers: {
          Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "AVHL/1.0 (+https://avhl.org)",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const csv = await response.text();
      const liveByAbbreviation = parseLiveTeams(csv);
      return {
        liveByAbbreviation,
        endpoint: candidate.name,
        errors,
      };
    } catch (error) {
      errors.push(`${candidate.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "No Google Sheets CSV endpoint succeeded");
}

export async function getTeams() {
  try {
    const { liveByAbbreviation, endpoint, errors } = await fetchLiveSheet();
    const teams = fallbackTeams.map((team) => mergeTeam(team, liveByAbbreviation.get(team.abbreviation)));
    return {
      teams,
      source: "live",
      endpoint,
      liveTeamCount: liveByAbbreviation.size,
      errors,
    };
  } catch (error) {
    console.error("Unable to load live team branding; using bundled team data.", error);
    return {
      teams: fallbackTeams,
      source: "fallback",
      endpoint: null,
      liveTeamCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function getTeamBySlug(slug) {
  const { teams, source, endpoint, liveTeamCount, errors } = await getTeams();
  return {
    team: teams.find((candidate) => candidate.slug === slug) ?? null,
    teams,
    source,
    endpoint,
    liveTeamCount,
    errors,
  };
}
