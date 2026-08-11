#!/usr/bin/env python3
"""Generate data/teams.js from the 2026-27 Major League specification CSV.

This uses only Python's standard library so the team directory can be rebuilt
without adding another npm dependency.
"""
from __future__ import annotations

import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source" / "major-team-specifications-2026-27.csv"
OUTPUT = ROOT / "data" / "teams.js"

DIVISIONS = {
    "Pacific": [
        "Arizona Heat", "Denver Mountain Lions", "Honolulu Hawks", "Las Vegas Vipers",
        "Montana Miners", "Nevada Archers", "North Dakota Bison", "Portland Sea Lions",
        "Seattle Dragons", "Washington Admirals",
    ],
    "Central": [
        "Fort Worth Defenders", "Houston Hammerheads", "Iowa Rebels", "Kansas City Metrostars",
        "Lincoln Lumberjacks", "Memphis Cannons", "Oklahoma Twisters", "San Antonio Bandits",
        "South Dakota Spartans", "St. Louis Leopards",
    ],
    "Atlantic": [
        "Atlanta Cobalts", "Chicago Rockets", "Cincinnati Thunderbolts", "Cleveland Demons",
        "Columbus Cougars", "Detroit Motors", "Indianapolis Ghosts", "New Orleans Whalers",
        "Puerto Rico Toros", "Tennessee Wolverines",
    ],
    "Metropolitan": [
        "Baltimore Oceanics", "Brooklyn Bulldogs", "Charleston Tsunami", "Florida Sunshine",
        "Jacksonville Blood Hounds", "Long Island Blizzard", "New York Steamrollers",
        "Philadelphia Destroyers", "Raleigh Wildcats", "Richmond Robbers",
    ],
}
DIVISION_ORDER = ["Pacific", "Central", "Atlantic", "Metropolitan"]
TEAM_DIVISION = {team: division for division, teams in DIVISIONS.items() for team in teams}


def clean(value: str | None):
    if value is None:
        return None
    value = str(value).strip()
    return None if value == "" or value.lower() == "nan" else value


def maybe_number(value: str | None):
    value = clean(value)
    if value is None:
        return None
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    if re.fullmatch(r"-?\d+\.\d+", value):
        return float(value)
    return value


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def rgb_to_hex(value: str | None):
    value = clean(value)
    if not value:
        return None
    if value.startswith("#") and len(value) == 7:
        return value.upper()
    parts = re.findall(r"\d+", value)
    if len(parts) >= 3:
        r, g, b = [max(0, min(255, int(part))) for part in parts[:3]]
        return f"#{r:02X}{g:02X}{b:02X}"
    return None


with SOURCE.open(newline="", encoding="utf-8-sig") as handle:
    rows = list(csv.DictReader(handle))

teams = []
for row in rows:
    city = clean(row.get("City/Location"))
    nickname = clean(row.get("Team Nickname"))
    name = f"{city} {nickname}"
    if name not in TEAM_DIVISION:
        raise ValueError(f"No division mapping for {name!r}")

    division = TEAM_DIVISION[name]
    teams.append({
        "name": name,
        "slug": slugify(name),
        "city": city,
        "nickname": nickname,
        "abbreviation": clean(row.get("Abbreviation")),
        "playByPlayName": clean(row.get("Play by Play Team Name")),
        "conference": "Western" if division in {"Pacific", "Central"} else "Eastern",
        "division": division,
        "arena": clean(row.get("Arena Name")),
        "prestige": clean(row.get("Team Prestige")),
        "marketSize": clean(row.get("Market Size")),
        "localFanBase": clean(row.get("Local Fan Base")),
        "nationalFanBase": clean(row.get("National Fan Base")),
        "localPopularity": clean(row.get("Local Popularity")),
        "nationalPopularity": clean(row.get("National Popularity")),
        "owner": {
            "spending": maybe_number(row.get("Owner Spending Rating")),
            "success": maybe_number(row.get("Owner Success Rating")),
            "patience": maybe_number(row.get("Owner Patience Rating")),
        },
        "tax": {
            "federal": clean(row.get("Federal Tax Rate")),
            "state": clean(row.get("State Tax Rate")),
        },
        "facilities": {
            "concessions": maybe_number(row.get("Concession Level")),
            "clubSeating": maybe_number(row.get("Club Seating Level")),
            "teamStore": maybe_number(row.get("Team Store Level")),
            "parking": maybe_number(row.get("Parking Lot Level")),
        },
        "colors": {
            "primary": clean(row.get("Hex 1")) or rgb_to_hex(row.get("Team Color 1")) or "#000B36",
            "primaryName": clean(row.get("Color 1")),
            "secondary": rgb_to_hex(row.get("Team Color 2")) or "#FFFFFF",
            "secondaryName": clean(row.get("Color 2")),
            "tertiary": rgb_to_hex(row.get("Team Color 3")) or "#A90117",
            "tertiaryName": clean(row.get("Color 3")),
        },
    })

order = {division: index for index, division in enumerate(DIVISION_ORDER)}
teams.sort(key=lambda team: (order[team["division"]], team["name"]))

assert len(teams) == 40, f"Expected 40 teams, found {len(teams)}"
counts = Counter(team["division"] for team in teams)
assert all(counts[division] == 10 for division in DIVISION_ORDER), counts

js = f'''// AUTO-GENERATED from data/source/major-team-specifications-2026-27.csv
// Run: python scripts/generate-teams.py

export const divisionOrder = {json.dumps(DIVISION_ORDER)};

export const conferenceMap = {{
  Western: ["Pacific", "Central"],
  Eastern: ["Atlantic", "Metropolitan"],
}};

export const teams = {json.dumps(teams, indent=2, ensure_ascii=False)};

export const teamBySlug = Object.fromEntries(teams.map((team) => [team.slug, team]));

export const teamsByDivision = Object.fromEntries(
  divisionOrder.map((division) => [
    division,
    teams.filter((team) => team.division === division),
  ])
);
'''
OUTPUT.write_text(js, encoding="utf-8")
print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(teams)} teams: {dict(counts)}")
