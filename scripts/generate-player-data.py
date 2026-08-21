#!/usr/bin/env python3
"""Generate the compact website player index from the full AVHL ratings CSVs."""

from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "data" / "source"
SKATERS_PATH = SOURCE_DIR / "player-ratings-skaters-2026-27.csv"
GOALIES_PATH = SOURCE_DIR / "player-ratings-goalies-2026-27.csv"
OUTPUT_PATH = ROOT / "data" / "players.js"


def number(value: str, *, decimal: bool = False):
    value = (value or "").strip()
    if not value:
        return None
    return float(value) if decimal else int(float(value))


def iso_date(value: str):
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%m/%d/%Y").date().isoformat()


def read_rows(path: Path):
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def skater(row):
    return {
        "id": row["AVHL ID"].zfill(4),
        "name": row["Full Name"].strip(),
        "currentTeam": row["Current Team"].strip() or "UFA",
        "yearsLeft": number(row["Years Left"]),
        "overall": number(row["Overall Rating"]),
        "birthdate": iso_date(row["Birthdate"]),
        "number": number(row["Jersey #"]),
        "position": row["Position(s)"].strip(),
        "height": row["Height"].strip(),
        "weight": number(row["Weight"]),
        "age": number(row["Age"]),
        "handedness": row["Shot"].strip(),
        "playerType": row["Player Type"].strip(),
        "league": row["League"].strip(),
        "proTeam": row["Team"].strip(),
        "role": "Skater",
        "season": {
            "g": number(row["25-26 G"]),
            "a": number(row["25-26 A"]),
            "pts": number(row["25-26 P"]),
        },
        "career": {
            "g": number(row["Total G"]),
            "a": number(row["Total A"]),
            "pts": number(row["Total PTS"]),
        },
    }


def goalie(row):
    return {
        "id": row["AVHL ID"].zfill(4),
        "name": row["Full Name"].strip(),
        "currentTeam": row["Current Team"].strip() or "UFA",
        "yearsLeft": number(row["Years Left"]),
        "overall": number(row["Overall Rating"]),
        "birthdate": iso_date(row["Birthdate"]),
        "number": number(row["Jersey #"]),
        "position": "G",
        "height": row["Height"].strip(),
        "weight": number(row["Weight"]),
        "age": number(row["Age"]),
        "handedness": row["Glove"].strip(),
        "playerType": "Goalie",
        "league": row["League"].strip(),
        "proTeam": row["Team"].strip(),
        "role": "Goalie",
        "season": {
            "sa": number(row["25-26 SA"]),
            "sv": number(row["25-26 SV"]),
            "svPct": number(row["25-26 SV%"], decimal=True),
        },
        "career": {
            "sa": number(row["Total SA"]),
            "sv": number(row["Total SV"]),
            "svPct": number(row["Career SV%"], decimal=True),
        },
    }


def main():
    skaters = [skater(row) for row in read_rows(SKATERS_PATH)]
    goalies = [goalie(row) for row in read_rows(GOALIES_PATH)]
    players = skaters + goalies

    ids = [player["id"] for player in players]
    if len(players) != 1909:
        raise ValueError(f"Expected 1,909 players, found {len(players):,}")
    if len(set(ids)) != len(ids):
        raise ValueError("Player IDs must be unique")
    if any(not player["name"] for player in players):
        raise ValueError("Every player must have a name")

    counts = {
        "total": len(players),
        "skaters": len(skaters),
        "goalies": len(goalies),
        "ufa": sum(player["currentTeam"] == "UFA" for player in players),
        "rostered": sum(player["currentTeam"] != "UFA" for player in players),
    }

    payload = json.dumps(players, indent=2, ensure_ascii=False)
    count_payload = json.dumps(counts, indent=2)
    OUTPUT_PATH.write_text(
        "// AUTO-GENERATED from the complete 2026-27 skater and goalie ratings CSVs\n"
        "// Run: python scripts/generate-player-data.py\n\n"
        f"export const playerCounts = {count_payload};\n\n"
        f"export const players = {payload};\n",
        encoding="utf-8",
    )
    print(
        f"Generated {OUTPUT_PATH.relative_to(ROOT)}: "
        f"{counts['total']:,} players ({counts['ufa']:,} UFA, {counts['rostered']:,} rostered)"
    )


if __name__ == "__main__":
    main()
