#!/usr/bin/env python3
"""Generate the website schedule data module from the official AVHL CSV."""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source" / "major-league-schedule-2026-27.csv"
OUTPUT = ROOT / "data" / "schedule.js"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


def number_or_none(value: str):
    value = value.strip()
    return int(value) if value else None


def main() -> None:
    with SOURCE.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))

    games = []
    team_games = Counter()
    home_games = Counter()
    away_games = Counter()
    games_by_date = Counter()
    teams_by_date = defaultdict(list)

    for row in rows:
        away_name = row["Away Team"].strip()
        home_name = row["Home Team"].strip()
        date = datetime.strptime(row["Date"].strip(), "%m/%d/%y").date().isoformat()
        away_score = number_or_none(row["Away Score"])
        home_score = number_or_none(row["Home Score"])
        overtime_text = row["OT?"].strip().lower()

        game = {
            "id": int(row["Game #"]),
            "day": int(row["Day"]),
            "date": date,
            "away": slugify(away_name),
            "home": slugify(home_name),
            "awayScore": away_score,
            "homeScore": home_score,
            "overtime": True if overtime_text in {"yes", "y", "true", "ot", "so"} else None,
        }
        games.append(game)

        for team in (away_name, home_name):
            team_games[team] += 1
            teams_by_date[date].append(team)
        away_games[away_name] += 1
        home_games[home_name] += 1
        games_by_date[date] += 1

    unique_teams = sorted(team_games)
    assert len(games) == 1640, f"Expected 1,640 games; found {len(games)}"
    assert len(unique_teams) == 40, f"Expected 40 teams; found {len(unique_teams)}"
    assert set(team_games.values()) == {82}, f"Every team must have 82 games: {team_games}"
    assert set(home_games.values()) == {41}, f"Every team must have 41 home games: {home_games}"
    assert set(away_games.values()) == {41}, f"Every team must have 41 away games: {away_games}"
    assert set(games_by_date.values()) == {8}, "Every date must contain exactly eight games"
    assert all(len(teams) == len(set(teams)) for teams in teams_by_date.values()), "A team is scheduled twice on one date"

    output = """// AUTO-GENERATED from data/source/major-league-schedule-2026-27.csv
// Run: python scripts/generate-schedule-data.py

export const schedule = %s;

export const scheduleByTeam = schedule.reduce((index, game) => {
  for (const slug of [game.away, game.home]) {
    if (!index[slug]) index[slug] = [];
    index[slug].push(game);
  }
  return index;
}, {});

export const scheduleByDate = schedule.reduce((index, game) => {
  if (!index[game.date]) index[game.date] = [];
  index[game.date].push(game);
  return index;
}, {});

export const seasonDates = Object.keys(scheduleByDate).sort();
export const seasonMonths = [...new Set(seasonDates.map((date) => date.slice(0, 7)))];
""" % json.dumps(games, separators=(",", ":"))

    OUTPUT.write_text(output, encoding="utf-8")
    print(f"Generated {OUTPUT.relative_to(ROOT)} with {len(games)} games for {len(unique_teams)} teams.")


if __name__ == "__main__":
    main()
