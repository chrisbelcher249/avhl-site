import { NextResponse } from "next/server";
import { getPlayers } from "@/lib/players";
import { teams } from "../../../../data/teams";

export const dynamic = "force-dynamic";

function rating(player, key) {
  const value = Number(player?.ratings?.[key]);
  return Number.isFinite(value) ? value : null;
}

function toSimSkater(player) {
  return {
    id: `avhl-${player.id}`,
    avhlId: player.id,
    name: player.name,
    number: player.number,
    listedPositions: player.position,
    overall: player.overall,
    deking: rating(player, "Deking"),
    handEye: rating(player, "Hand Eye"),
    passing: rating(player, "Passing"),
    puckControl: rating(player, "Puck Control"),
    discipline: rating(player, "Discipline"),
    offensiveAwareness: rating(player, "Off. Awareness"),
    poise: rating(player, "Poise"),
    slapShotAccuracy: rating(player, "Slap Shot Accuracy"),
    slapShotPower: rating(player, "Slap Shot Power"),
    wristShotAccuracy: rating(player, "Wrist Shot Accuracy") ?? rating(player, "Wrist Shot Acc."),
    wristShotPower: rating(player, "Wrist Shot Power"),
    defensiveAwareness: rating(player, "Def. Awareness"),
    faceoffs: rating(player, "Faceoffs"),
    shotBlocking: rating(player, "Shot Blocking"),
    stickChecking: rating(player, "Stick Checking"),
    acceleration: rating(player, "Acceleration"),
    agility: rating(player, "Agility"),
    balance: rating(player, "Balance"),
    endurance: rating(player, "Endurance"),
    speed: rating(player, "Speed"),
    aggressiveness: rating(player, "Aggressiveness"),
    bodyChecking: rating(player, "Body Checking"),
    durability: rating(player, "Durability"),
    fightingSkill: rating(player, "Fighting Skill"),
    strength: rating(player, "Strength"),
  };
}

function toSimGoalie(player) {
  return {
    id: `avhl-${player.id}`,
    avhlId: player.id,
    name: player.name,
    number: player.number,
    listedPositions: "G",
    overall: player.overall,
    angles: rating(player, "Angles"),
    breakaway: rating(player, "Breakaway"),
    fiveHole: rating(player, "Five Hole"),
    gloveHigh: rating(player, "Glove High"),
    gloveLow: rating(player, "Glove Low"),
    stickHigh: rating(player, "Stick High"),
    stickLow: rating(player, "Stick Low"),
    passing: rating(player, "Passing"),
    poise: rating(player, "Poise"),
    pokeCheck: rating(player, "Poke Check"),
    puckPlayingFrequency: rating(player, "Puck Playing Freq."),
    reboundControl: rating(player, "Rebound Control"),
    recover: rating(player, "Recover"),
    aggressiveness: rating(player, "Aggressiveness"),
    agility: rating(player, "Agility"),
    durability: rating(player, "Durability"),
    endurance: rating(player, "Endurance"),
    speed: rating(player, "Speed"),
    vision: rating(player, "Vision"),
  };
}

export async function GET() {
  const { players, source } = await getPlayers();
  const rosters = {};

  for (const team of teams) {
    const teamPlayers = players.filter((player) => player.currentTeam === team.name);
    rosters[team.abbreviation] = {
      teamName: team.name,
      skaters: teamPlayers.filter((player) => player.role === "Skater").map(toSimSkater),
      goalies: teamPlayers.filter((player) => player.role === "Goalie").map(toSimGoalie),
    };
  }

  return NextResponse.json(
    {
      source,
      generatedAt: new Date().toISOString(),
      rosters,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
