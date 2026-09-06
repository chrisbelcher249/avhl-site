import { historicalPlayers, historicalPlayerSummary } from "../../data/playerHistory";
import { players as fallbackPlayers } from "../../data/players";

const historyById = new Map(historicalPlayers.map((player) => [player.id, player]));
const fallbackById = new Map(fallbackPlayers.map((player) => [player.id, player]));

const knownByName = new Map();
for (const player of historicalPlayers) knownByName.set(player.name.toLowerCase(), player.id);
for (const player of fallbackPlayers) knownByName.set(player.name.toLowerCase(), player.id);

export const playerHistorySummary = {
  ...historicalPlayerSummary,
  currentPlayers: fallbackPlayers.length,
  historicalOnly: historicalPlayers.filter((player) => !fallbackById.has(player.id)).length,
  currentWithoutHistory: fallbackPlayers.filter((player) => !historyById.has(player.id)).length,
  knownPlayers: new Set([...historyById.keys(), ...fallbackById.keys()]).size,
};

export function getHistoricalPlayers() {
  return historicalPlayers;
}

export function getHistoricalPlayer(id) {
  return historyById.get(String(id || "").padStart(4, "0")) || null;
}

export function getFallbackPlayer(id) {
  return fallbackById.get(String(id || "").padStart(4, "0")) || null;
}

export function getKnownPlayerIdByName(name) {
  return knownByName.get(String(name || "").trim().toLowerCase()) || null;
}

export function getKnownPlayerIdentity(id) {
  const normalized = String(id || "").padStart(4, "0");
  const current = fallbackById.get(normalized);
  const history = historyById.get(normalized);
  if (!current && !history) return null;
  return {
    id: normalized,
    name: current?.name || history?.name,
    role: current?.role || history?.role,
  };
}

export function getPlayerNameIndex() {
  return Object.fromEntries(knownByName.entries());
}
