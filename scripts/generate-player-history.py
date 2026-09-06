import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKATERS = ROOT / "data/source/player-career-stats-skaters-through-2025-26.csv"
GOALIES = ROOT / "data/source/player-career-stats-goalies-through-2025-26.csv"
OUTPUT = ROOT / "data/playerHistory.js"

SEASONS = [
    ("2022-23", "22-23"),
    ("2023-24", "23-24"),
    ("2024-25", "24-25"),
    ("2025-26", "25-26"),
]


def integer(value):
    text = str(value or "").strip()
    if not text:
        return 0
    return int(float(text))


def decimal(value):
    text = str(value or "").strip()
    if not text:
        return 0.0
    return float(text)


def read_skaters():
    records = []
    with SKATERS.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            player_id = str(row.get("AVHL ID", "")).strip().zfill(4)
            name = str(row.get("Player", "")).strip()
            if not player_id or not name:
                continue
            records.append({
                "id": player_id,
                "name": name,
                "role": "Skater",
                "seasons": [
                    {
                        "season": season,
                        "g": integer(row.get(f"{prefix} G")),
                        "a": integer(row.get(f"{prefix} A")),
                        "pts": integer(row.get(f"{prefix} P")),
                    }
                    for season, prefix in SEASONS
                ],
                "career": {
                    "g": integer(row.get("Total G")),
                    "a": integer(row.get("Total A")),
                    "pts": integer(row.get("Total PTS")),
                },
            })
    return records


def read_goalies():
    records = []
    with GOALIES.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            player_id = str(row.get("AVHL ID", "")).strip().zfill(4)
            name = str(row.get("Player", "")).strip()
            if not player_id or not name:
                continue
            records.append({
                "id": player_id,
                "name": name,
                "role": "Goalie",
                "seasons": [
                    {
                        "season": season,
                        "sa": integer(row.get(f"{prefix} SA")),
                        "sv": integer(row.get(f"{prefix} SV")),
                        "svPct": decimal(row.get(f"{prefix} SV%")),
                    }
                    for season, prefix in SEASONS
                ],
                "career": {
                    "sa": integer(row.get("Total SA")),
                    "sv": integer(row.get("Total SV")),
                    "svPct": decimal(row.get("Career SV%")),
                },
            })
    return records


records = sorted(read_skaters() + read_goalies(), key=lambda record: int(record["id"]))
summary = {
    "total": len(records),
    "skaters": sum(record["role"] == "Skater" for record in records),
    "goalies": sum(record["role"] == "Goalie" for record in records),
    "seasons": len(SEASONS),
}

OUTPUT.write_text(
    "// AUTO-GENERATED from AVHL career-statistics CSVs through 2025-26.\n"
    "// Run: python scripts/generate-player-history.py\n\n"
    f"export const historicalPlayerSummary = {json.dumps(summary, indent=2)};\n\n"
    f"export const historicalPlayers = {json.dumps(records, indent=2, ensure_ascii=False)};\n",
    encoding="utf-8",
)
print(f"Wrote {len(records)} historical player records to {OUTPUT}")
