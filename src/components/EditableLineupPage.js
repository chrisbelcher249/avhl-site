"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isDefensePlayer,
  isForwardPlayer,
  isGoaliePlayer,
  isNaturalPosition,
  validateLineupRecord,
} from "@/lib/lineupRecords";

const FORWARD_POSITIONS = ["LW", "C", "RW"];
const DEFENSE_POSITIONS = ["LD", "RD"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function numberText(player) {
  const value = Number(player?.number);
  return Number.isFinite(value) ? `#${value}` : "No. —";
}

function playerPositionLabel(player) {
  return player?.position || player?.role || "—";
}

function formatUpdated(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function SectionHeading({ eyebrow, title, copy }) {
  return (
    <div className="max-w-4xl">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#A90117]">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-black tracking-tight md:text-[2rem]">{title}</h2>
      {copy ? <p className="mt-1.5 text-[13px] font-semibold leading-5 text-[#000B36]/48 md:text-sm">{copy}</p> : null}
    </div>
  );
}

function PositionBadge({ player, assignedPosition }) {
  const natural = !assignedPosition || isNaturalPosition(player, assignedPosition);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-[#000B36] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
        {assignedPosition || playerPositionLabel(player)}
      </span>
      {!natural ? (
        <span className="rounded-full bg-[#A90117]/8 px-2 py-0.5 text-[9px] font-black text-[#A90117]">
          Listed {playerPositionLabel(player)} · 3% sim penalty
        </span>
      ) : null}
    </div>
  );
}

function PlayerCard({ player, assignedPosition = null, roleLabel = null, team, compact = false, order = null }) {
  if (!player) {
    return (
      <div className={`block h-full min-w-0 rounded-xl border border-dashed border-[#000B36]/15 bg-[#F8FAFD] ${compact ? "min-h-[96px] p-3" : "min-h-[108px] p-4"}`}>
        <p className="text-xs font-black uppercase tracking-wide text-[#000B36]/30">Open slot</p>
      </div>
    );
  }

  return (
    <Link
      href={`/players/${player.id}`}
      className={`group relative block h-full min-w-0 overflow-hidden rounded-xl border border-[#D7DFEA] bg-[#FBFCFE] transition duration-150 hover:-translate-y-px hover:border-[#18BDFC]/65 hover:bg-white hover:shadow-[0_7px_20px_rgba(0,11,54,0.08)] ${compact ? "min-h-[96px] p-3" : "min-h-[108px] p-4"}`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: team.colors.primary }} />
      <div className="flex h-full min-w-0 items-start justify-between gap-3 pl-1.5">
        <div className="min-w-0 flex-1">
          {order ? (
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#000B36] text-[10px] font-black text-white">{order}</span>
              <span className="rounded-full bg-[#000B36]/6 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#000B36]/55">SO {order}</span>
            </div>
          ) : roleLabel ? (
            <span className="inline-flex rounded-full bg-[#000B36] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">{roleLabel}</span>
          ) : (
            <PositionBadge player={player} assignedPosition={assignedPosition} />
          )}
          <p className={`${compact ? "mt-2 text-[13px]" : "mt-2.5 text-[15px]"} min-w-0 font-black leading-[1.15] text-[#000B36] transition group-hover:text-[#A90117]`}>
            {player.name}
          </p>
          <p className="mt-1.5 text-[10px] font-bold leading-none text-[#000B36]/42">{numberText(player)} · {playerPositionLabel(player)}</p>
        </div>
        <div className="min-w-[50px] shrink-0 rounded-xl border border-[#000B36]/6 bg-white px-2 py-2 text-center shadow-[0_1px_3px_rgba(0,11,54,0.03)]">
          <p className={`${compact ? "text-base" : "text-lg"} font-black leading-none tabular-nums text-[#000B36]`}>{Number.isFinite(Number(player.overall)) ? player.overall : "—"}</p>
          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.16em] text-[#000B36]/32">OVR</p>
        </div>
      </div>
    </Link>
  );
}

function SelectSlot({
  value,
  options,
  playerById,
  label,
  assignedPosition = null,
  team,
  onChange,
  order = null,
  dragHandleProps = null,
}) {
  const player = playerById.get(String(value || ""));
  const valueStillAvailable = options.some((candidate) => String(candidate.id) === String(value));
  return (
    <div className="relative block h-full min-w-0 overflow-hidden rounded-xl border border-[#18BDFC]/40 bg-[#FBFCFE] p-3 shadow-[0_2px_8px_rgba(0,11,54,0.04)]">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: team.colors.primary }} />
      <div className="pl-1">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-[#000B36] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
            {order ? `SO ${order}` : label}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {player ? <span className="text-[10px] font-black text-[#000B36]/35">{player.overall ?? "—"} OVR</span> : null}
            {player && dragHandleProps ? (
              <span
                {...dragHandleProps}
                draggable
                className="inline-flex cursor-grab select-none items-center gap-1 rounded-full border border-[#000B36]/10 bg-white px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#000B36]/50 shadow-sm active:cursor-grabbing"
                title="Drag player"
                aria-hidden="true"
              >
                ↕ <span className="hidden sm:inline">Drag</span>
              </span>
            ) : null}
          </div>
        </div>
        <select
          value={valueStillAvailable ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2.5 w-full min-w-0 rounded-lg border border-[#000B36]/12 bg-white px-3 py-2.5 text-sm font-black text-[#000B36] outline-none transition focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
          aria-label={label}
        >
          <option value="">Choose player…</option>
          {options.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {candidate.position || candidate.role} · {candidate.overall ?? "—"} OVR
            </option>
          ))}
        </select>
        {player ? (
          <div className="mt-2">
            <p className="truncate text-xs font-black">{player.name}</p>
            <p className="mt-0.5 text-[9px] font-bold text-[#000B36]/38">{numberText(player)} · Listed {playerPositionLabel(player)}</p>
            {assignedPosition && !isNaturalPosition(player, assignedPosition) ? (
              <p className="mt-1 text-[9px] font-black text-[#A90117]">3% simulator penalty at {assignedPosition}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function copyRecord(record) {
  return clone(record);
}

function reconcileDressedReferences(record) {
  const next = copyRecord(record);
  const dressed = new Set([
    ...next.forwards.map((entry) => entry.playerId),
    ...next.defense.map((entry) => entry.playerId),
  ]);
  for (const key of ["pp1", "pp2", "pk1", "pk2"]) {
    next.specialTeams[key] = next.specialTeams[key].map((id) => dressed.has(id) ? id : "");
  }
  next.overtimeUnits = next.overtimeUnits.map((unit) => unit.map((id) => dressed.has(id) ? id : ""));
  next.shootoutOrder = next.shootoutOrder.map((id) => dressed.has(id) ? id : "");
  return next;
}

function transferDressedReferences(record, oldId, newId) {
  if (!oldId || !newId || oldId === newId) return record;
  const next = copyRecord(record);
  const replace = (id) => id === oldId ? newId : id;
  for (const key of ["pp1", "pp2", "pk1", "pk2"]) {
    next.specialTeams[key] = next.specialTeams[key].map(replace);
  }
  next.overtimeUnits = next.overtimeUnits.map((unit) => unit.map(replace));
  next.shootoutOrder = next.shootoutOrder.map(replace);
  return next;
}

function replaceOrSwap(entries, index, playerId) {
  const next = entries.map((entry) => ({ ...entry }));
  const oldId = next[index]?.playerId || "";
  const duplicateIndex = next.findIndex((entry, candidateIndex) => candidateIndex !== index && entry.playerId === playerId);
  next[index].playerId = playerId;
  if (duplicateIndex >= 0) next[duplicateIndex].playerId = oldId;
  return next;
}

function replaceOrSwapId(ids, index, playerId) {
  const next = [...ids];
  const oldId = next[index] || "";
  const duplicateIndex = next.findIndex((id, candidateIndex) => candidateIndex !== index && id === playerId);
  next[index] = playerId;
  if (duplicateIndex >= 0) next[duplicateIndex] = oldId;
  return next;
}

function inferPpFormations(record, rosterPlayers) {
  const defenseIds = new Set((rosterPlayers || []).filter((player) => isDefensePlayer(player) && !isGoaliePlayer(player)).map((player) => String(player.id)));
  const formationFor = (key) => (record?.specialTeams?.[key] || []).filter((id) => defenseIds.has(String(id))).length >= 2 ? "3F2D" : "4F1D";
  return { pp1: formationFor("pp1"), pp2: formationFor("pp2") };
}

function ppRoles(formation) {
  return formation === "3F2D" ? ["F1", "F2", "F3", "D1", "D2"] : ["F1", "F2", "F3", "F4", "D1"];
}

export default function EditableLineupPage({
  team,
  teams,
  rosterPlayers,
  initialRecord,
  initialSource,
  rosterSource,
  storage,
  storageError = null,
  savedErrors = [],
}) {
  const router = useRouter();
  const [record, setRecord] = useState(() => copyRecord(initialRecord));
  const [baseline, setBaseline] = useState(() => copyRecord(initialRecord));
  const [lineupSource, setLineupSource] = useState(initialSource);
  const [authenticated, setAuthenticated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [activePassword, setActivePassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveErrors, setSaveErrors] = useState([]);
  const [ppFormations, setPpFormations] = useState(() => inferPpFormations(initialRecord, rosterPlayers));
  const [dragging, setDragging] = useState(null);
  const [dragOverKey, setDragOverKey] = useState("");

  const playerById = useMemo(() => new Map(rosterPlayers.map((player) => [String(player.id), player])), [rosterPlayers]);
  const forwardRoster = useMemo(() => rosterPlayers.filter(isForwardPlayer).sort((a, b) => (b.overall || 0) - (a.overall || 0)), [rosterPlayers]);
  const defenseRoster = useMemo(() => rosterPlayers.filter((player) => isDefensePlayer(player) && !isGoaliePlayer(player)).sort((a, b) => (b.overall || 0) - (a.overall || 0)), [rosterPlayers]);
  const goalieRoster = useMemo(() => rosterPlayers.filter(isGoaliePlayer).sort((a, b) => (b.overall || 0) - (a.overall || 0)), [rosterPlayers]);

  const dressedForwardIds = useMemo(() => new Set(record.forwards.map((entry) => entry.playerId).filter(Boolean)), [record]);
  const dressedDefenseIds = useMemo(() => new Set(record.defense.map((entry) => entry.playerId).filter(Boolean)), [record]);
  const dressedForwards = useMemo(() => forwardRoster.filter((player) => dressedForwardIds.has(String(player.id))), [forwardRoster, dressedForwardIds]);
  const dressedDefense = useMemo(() => defenseRoster.filter((player) => dressedDefenseIds.has(String(player.id))), [defenseRoster, dressedDefenseIds]);
  const dressedSkaters = useMemo(() => [...dressedForwards, ...dressedDefense], [dressedForwards, dressedDefense]);
  const dressedIds = useMemo(() => new Set([
    ...record.forwards.map((entry) => entry.playerId),
    ...record.defense.map((entry) => entry.playerId),
    ...record.goalies.map((entry) => entry.playerId),
  ].filter(Boolean)), [record]);
  const scratches = useMemo(() => rosterPlayers.filter((player) => !dressedIds.has(String(player.id))).sort((a, b) => (b.overall || 0) - (a.overall || 0)), [rosterPlayers, dressedIds]);
  const validation = useMemo(() => validateLineupRecord(record, rosterPlayers, team.abbreviation), [record, rosterPlayers, team.abbreviation]);
  const displayedErrors = saveErrors.length
    ? saveErrors
    : editing && !validation.ok
      ? validation.errors
      : [];

  const updatedText = formatUpdated(record.updatedAt);
  const editAvailabilityIssue = !storage?.configured
    ? "Editing is unavailable until persistent lineup storage is connected."
    : storageError
      ? "Editing is temporarily unavailable because the latest saved lineup could not be verified."
      : rosterSource !== "live"
        ? "Editing is temporarily unavailable until the complete live roster feed returns."
        : null;

  function groupForPlayer(player) {
    if (!player) return null;
    if (isGoaliePlayer(player)) return "goalies";
    if (isDefensePlayer(player)) return "defense";
    if (isForwardPlayer(player)) return "forwards";
    return null;
  }

  function dressedLocation(playerId) {
    const id = String(playerId || "");
    const forwardIndex = record.forwards.findIndex((entry) => String(entry.playerId || "") === id);
    if (forwardIndex >= 0) return { type: "even", kind: "forwards", index: forwardIndex };
    const defenseIndex = record.defense.findIndex((entry) => String(entry.playerId || "") === id);
    if (defenseIndex >= 0) return { type: "even", kind: "defense", index: defenseIndex };
    const goalieIndex = record.goalies.findIndex((entry) => String(entry.playerId || "") === id);
    if (goalieIndex >= 0) return { type: "goalie", index: goalieIndex };
    return null;
  }

  function canDropPlayer(payload, target) {
    const player = playerById.get(String(payload?.playerId || ""));
    if (!editing || !player || !target) return false;
    const group = groupForPlayer(player);
    if (target.type === "even") return group === target.kind;
    if (target.type === "goalie") return group === "goalies";
    if (target.type === "special") {
      if (!dressedIds.has(String(player.id)) || group === "goalies") return false;
      return target.role.startsWith("D") ? group === "defense" : target.role.startsWith("F") ? group === "forwards" : true;
    }
    if (target.type === "ot") {
      if (!dressedIds.has(String(player.id))) return false;
      return target.role.startsWith("D") ? group === "defense" : group === "forwards";
    }
    if (target.type === "shootout") return dressedIds.has(String(player.id)) && group !== "goalies";
    if (target.type === "scratch") {
      const location = dressedLocation(player.id);
      return Boolean(location && group === target.group && String(target.playerId) !== String(player.id));
    }
    return false;
  }

  function startDrag(event, playerId, source) {
    const payload = { playerId: String(playerId || ""), source };
    if (!payload.playerId) return;
    setDragging(payload);
    setDragOverKey("");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-avhl-lineup", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", payload.playerId);
  }

  function endDrag() {
    setDragging(null);
    setDragOverKey("");
  }

  function readDragPayload(event) {
    if (dragging) return dragging;
    try {
      return JSON.parse(event.dataTransfer.getData("application/x-avhl-lineup") || "null");
    } catch {
      return null;
    }
  }

  function applyDrop(payload, target) {
    if (!canDropPlayer(payload, target)) return;
    const playerId = String(payload.playerId);
    if (target.type === "even") updateEven(target.kind, target.index, playerId);
    else if (target.type === "goalie") updateGoalie(target.index, playerId);
    else if (target.type === "special") updateSpecial(target.key, target.index, playerId);
    else if (target.type === "ot") updateOt(target.unitIndex, target.slotIndex, playerId);
    else if (target.type === "shootout") updateShootout(target.index, playerId);
    else if (target.type === "scratch") {
      const location = dressedLocation(playerId);
      if (location?.type === "even") updateEven(location.kind, location.index, String(target.playerId));
      else if (location?.type === "goalie") updateGoalie(location.index, String(target.playerId));
    }
    setDragging(null);
    setDragOverKey("");
  }

  function dragHandleProps(playerId, source) {
    if (!editing || !playerId) return null;
    return {
      onDragStart: (event) => startDrag(event, playerId, source),
      onDragEnd: endDrag,
    };
  }

  function wrapDropZone(target, child) {
    if (!editing) return child;
    const eligible = Boolean(dragging && canDropPlayer(dragging, target));
    const active = eligible && dragOverKey === target.key;
    return (
      <div
        className={`relative h-full min-w-0 rounded-xl transition ${eligible ? "ring-2 ring-[#18BDFC]/30" : ""} ${active ? "ring-[3px] ring-[#18BDFC] shadow-[0_0_0_4px_rgba(24,189,252,0.10)]" : ""}`}
        onDragEnter={(event) => {
          if (!eligible) return;
          event.preventDefault();
          setDragOverKey(target.key);
        }}
        onDragOver={(event) => {
          if (!eligible) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          if (dragOverKey !== target.key) setDragOverKey(target.key);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragOverKey((current) => current === target.key ? "" : current);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const payload = readDragPayload(event);
          applyDrop(payload, target);
        }}
      >
        {child}
        {active ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-[#18BDFC]/12 backdrop-blur-[1px]">
            <span className="rounded-full bg-[#000B36] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-lg">Drop here</span>
          </div>
        ) : null}
      </div>
    );
  }

  function updateEven(kind, index, playerId) {
    setRecord((current) => {
      let next = copyRecord(current);
      const oldId = String(next[kind]?.[index]?.playerId || "");
      const replacementId = String(playerId || "");
      const alreadyDressed = next[kind].some((entry, candidateIndex) =>
        candidateIndex !== index && String(entry.playerId || "") === replacementId
      );
      next[kind] = replaceOrSwap(next[kind], index, replacementId);

      // If an owner dresses a previously scratched skater, carry that outgoing
      // player's PP/PK/OT/SO assignments to the replacement. This preserves a
      // valid lineup instead of creating a cluster of empty special-team slots.
      // When two already-dressed players are merely swapped, their special-team
      // assignments stay attached to the players themselves.
      if (oldId && replacementId && !alreadyDressed) {
        next = transferDressedReferences(next, oldId, replacementId);
      }
      return reconcileDressedReferences(next);
    });
    setSaveErrors([]);
    setNotice("");
  }

  function updateGoalie(index, playerId) {
    setRecord((current) => {
      const next = copyRecord(current);
      next.goalies = replaceOrSwap(next.goalies, index, playerId);
      return next;
    });
    setSaveErrors([]);
  }

  function updateSpecial(key, index, playerId) {
    setRecord((current) => {
      const next = copyRecord(current);
      next.specialTeams[key] = replaceOrSwapId(next.specialTeams[key], index, playerId);
      return next;
    });
    setSaveErrors([]);
  }

  function changePpFormation(key, formation) {
    setPpFormations((current) => ({ ...current, [key]: formation }));
    setRecord((current) => {
      const next = copyRecord(current);
      const existing = next.specialTeams[key] || [];
      const forwardSet = new Set(dressedForwards.map((player) => String(player.id)));
      const defenseSet = new Set(dressedDefense.map((player) => String(player.id)));
      const forwards = existing.filter((id) => forwardSet.has(String(id)));
      const defense = existing.filter((id) => defenseSet.has(String(id)));
      const used = new Set();
      const take = (pool, fallback) => {
        const id = pool.find((candidate) => candidate && !used.has(candidate)) || fallback.find((player) => !used.has(String(player.id)))?.id || "";
        if (id) used.add(String(id));
        return String(id || "");
      };
      next.specialTeams[key] = ppRoles(formation).map((role) => role.startsWith("D") ? take(defense, dressedDefense) : take(forwards, dressedForwards));
      return next;
    });
    setSaveErrors([]);
  }

  function updateOt(unitIndex, slotIndex, playerId) {
    setRecord((current) => {
      const next = copyRecord(current);
      next.overtimeUnits[unitIndex] = replaceOrSwapId(next.overtimeUnits[unitIndex], slotIndex, playerId);
      return next;
    });
    setSaveErrors([]);
  }

  function updateShootout(index, playerId) {
    setRecord((current) => {
      const next = copyRecord(current);
      next.shootoutOrder = replaceOrSwapId(next.shootoutOrder, index, playerId);
      return next;
    });
    setSaveErrors([]);
  }

  async function signIn(event) {
    event.preventDefault();
    if (authenticating) return;
    setAuthError("");
    setAuthenticating(true);
    try {
      const response = await fetch("/api/lineup/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abbreviation: team.abbreviation, password: passwordInput }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setAuthError(payload?.error || "Incorrect team password.");
        return;
      }
      setAuthenticated(true);
      setActivePassword(passwordInput);
      setPasswordInput("");
      setModalOpen(false);
      setEditing(true);
      setNotice("");
    } catch {
      setAuthError("Unable to verify the team password right now.");
    } finally {
      setAuthenticating(false);
    }
  }

  function beginEdit() {
    if (editAvailabilityIssue) {
      setNotice(editAvailabilityIssue);
      return;
    }
    if (!authenticated) {
      setAuthError("");
      setModalOpen(true);
      return;
    }
    setRecord(copyRecord(baseline));
    setPpFormations(inferPpFormations(baseline, rosterPlayers));
    setEditing(true);
    setSaveErrors([]);
    setNotice("");
  }

  function cancelEdit() {
    setRecord(copyRecord(baseline));
    setPpFormations(inferPpFormations(baseline, rosterPlayers));
    setEditing(false);
    setSaveErrors([]);
    setNotice("");
  }

  function signOut() {
    cancelEdit();
    setAuthenticated(false);
    setActivePassword("");
  }

  async function save() {
    setNotice("");
    setSaveErrors([]);
    if (!validation.ok) {
      setSaveErrors(validation.errors);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/lineup/${team.abbreviation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: activePassword,
          expectedRevision: Math.max(0, Number(baseline?.revision) || 0),
          lineup: validation.record,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setSaveErrors(payload?.errors?.length ? payload.errors : [payload?.error || "Unable to save lineup."]);
        return;
      }
      setRecord(copyRecord(payload.saved));
      setBaseline(copyRecord(payload.saved));
      setPpFormations(inferPpFormations(payload.saved, rosterPlayers));
      setLineupSource("saved");
      setEditing(false);
      setNotice(`Saved revision ${payload.saved.revision}. The public lineup and simulator will use this version.`);
      router.refresh();
    } catch {
      setSaveErrors(["Unable to save lineup right now."]);
    } finally {
      setSaving(false);
    }
  }

  function renderEvenSlot(kind, index, label, assignedPosition, options) {
    const entry = record[kind][index];
    const player = playerById.get(String(entry?.playerId || ""));
    if (!editing) return <PlayerCard player={player} assignedPosition={assignedPosition} team={team} />;
    const target = { key: `even-${kind}-${index}`, type: "even", kind, index };
    return wrapDropZone(
      target,
      <SelectSlot
        value={entry?.playerId || ""}
        options={options}
        playerById={playerById}
        label={label}
        assignedPosition={assignedPosition}
        team={team}
        onChange={(value) => updateEven(kind, index, value)}
        dragHandleProps={dragHandleProps(entry?.playerId, { type: "even", kind, index })}
      />,
    );
  }

  function renderUnit(key, label, slotRoles, copy, { powerPlay = false } = {}) {
    const ids = record.specialTeams[key] || [];
    const formation = powerPlay ? ppFormations[key] : null;
    const roles = powerPlay ? ppRoles(formation) : slotRoles;
    return (
      <div className="rounded-2xl border border-[#D7DFEA] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,11,54,0.035)] md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#000B36]/65">{label}</h3>
            {copy ? <p className="mt-1 text-[10px] font-bold text-[#000B36]/38">{copy}</p> : null}
          </div>
          {editing && powerPlay ? (
            <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-[#000B36]/45">
              Formation
              <select value={formation} onChange={(event) => changePpFormation(key, event.target.value)} className="rounded-full border border-[#000B36]/12 bg-white px-3 py-2 text-[10px] font-black text-[#000B36] outline-none">
                <option value="4F1D">4F / 1D</option>
                <option value="3F2D">3F / 2D</option>
              </select>
            </label>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">{roles.length} skaters</span>
          )}
        </div>
        <div className={`grid grid-cols-1 gap-2.5 ${roles.length === 5 ? "sm:grid-cols-2 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          {roles.map((role, index) => {
            const id = ids[index] || "";
            const player = playerById.get(String(id));
            const options = role.startsWith("D") ? dressedDefense : role.startsWith("F") ? dressedForwards : dressedSkaters;
            return editing ? (
              <div key={`${key}-${index}`}>
                {wrapDropZone(
                  { key: `special-${key}-${index}`, type: "special", key, index, role },
                  <SelectSlot
                    value={id}
                    options={options}
                    playerById={playerById}
                    label={`${label} ${role}`}
                    assignedPosition={role.startsWith("D") ? "D" : role.startsWith("F") ? "F" : null}
                    team={team}
                    onChange={(value) => updateSpecial(key, index, value)}
                    dragHandleProps={dragHandleProps(id, { type: "special", key, index })}
                  />,
                )}
              </div>
            ) : (
              <PlayerCard key={`${key}-${index}`} player={player} roleLabel={role} team={team} compact />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F7FB] text-[#000B36]">
      <section className="relative isolate overflow-hidden bg-[#000724] text-white">
        <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 18% 10%, ${team.colors.primary}, transparent 38%)` }} />
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundColor: team.colors.primary }} />
        <div className="relative mx-auto max-w-7xl px-6 py-9 md:px-8 md:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {editing ? (
              <span className="text-sm font-black text-white/35">Finish or cancel editing before leaving</span>
            ) : (
              <Link href={`/teams/${team.slug}`} className="text-sm font-black text-white/55 transition hover:text-white">← {team.nickname} team page</Link>
            )}
            <label className="w-full sm:w-72">
              <span className="sr-only">Choose team lineup</span>
              <select
                value={team.slug}
                disabled={editing || saving}
                onChange={(event) => router.push(`/teams/${event.target.value}/lineup`)}
                className="w-full min-w-0 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white outline-none backdrop-blur transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((candidate) => (
                  <option key={candidate.slug} value={candidate.slug} className="bg-white text-[#000B36]">{candidate.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[1.8rem] border border-white/15 bg-white p-3 shadow-2xl md:h-36 md:w-36">
              <Image src={team.assets.logo} alt={`${team.name} logo`} width={700} height={700} className="h-full w-full object-contain" priority />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white/70">{team.abbreviation}</span>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${lineupSource === "saved" ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"}`}>
                  {lineupSource === "saved" ? "Owner lineup" : "Projected lineup"}
                </span>
              </div>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-white/60">{team.city}</p>
              <h1 className="mt-1 text-4xl font-black uppercase tracking-tight sm:text-5xl md:text-6xl">{team.nickname} Lineup</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/55">
                12 forwards, 6 defensemen and 2 goalies dressed. Special teams, two 3-on-3 groups and the first five shootout shooters are saved with the lineup.
              </p>
              {updatedText ? <p className="mt-2 text-[11px] font-bold text-white/38">Last owner update: {updatedText}</p> : null}
            </div>
            <div className="shrink-0 md:w-72">
              {!editing ? (
                <div>
                  <button
                    type="button"
                    onClick={beginEdit}
                    disabled={Boolean(editAvailabilityIssue)}
                    className="w-full rounded-2xl bg-white px-5 py-4 text-left text-sm font-black leading-5 text-[#000B36] transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-white"
                  >
                    {authenticated ? "Edit Lineup" : `${team.nickname} Owner? Sign In Here to Edit Lineup`}
                  </button>
                  {editAvailabilityIssue ? (
                    <p className="mt-2 text-center text-[10px] font-black leading-4 text-amber-100/80">{editAvailabilityIssue}</p>
                  ) : authenticated ? (
                    <button type="button" onClick={signOut} className="mt-2 w-full text-center text-[10px] font-black text-white/45 transition hover:text-white">Owner access unlocked · Sign out</button>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Editing {team.nickname}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={save} disabled={saving || !validation.ok} className="rounded-xl bg-white px-3 py-2.5 text-xs font-black text-[#000B36] disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : validation.ok ? "Save Changes" : `${validation.errors.length} Issue${validation.errors.length === 1 ? "" : "s"}`}</button>
                    <button type="button" onClick={cancelEdit} className="rounded-xl border border-white/15 px-3 py-2.5 text-xs font-black text-white">Cancel</button>
                  </div>
                  <button type="button" onClick={signOut} className="mt-2 text-[10px] font-black text-white/45 hover:text-white">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8 md:py-14">
        {notice ? <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm font-bold text-emerald-900">{notice}</div> : null}
        {storageError ? (
          <div className="mb-6 rounded-2xl border border-[#A90117]/25 bg-[#A90117]/6 px-4 py-3 text-xs font-bold leading-5 text-[#7A0010]">
            {storageError}
          </div>
        ) : null}
        {!storage?.configured ? (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-xs font-bold leading-5 text-amber-950">
            Persistent lineup storage is not connected on this deployment. Owner editing stays disabled, and the simulator will not start an official new game until Redis/KV is configured.
          </div>
        ) : null}
        {rosterSource !== "live" ? (
          <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-xs font-bold leading-5 text-amber-950">
            The complete live roster feed is temporarily unavailable. This page can still be viewed, but owner editing is paused so a stale roster cannot be saved.
          </div>
        ) : null}
        {savedErrors.length ? (
          <div className="mb-6 rounded-2xl border border-[#A90117]/20 bg-[#A90117]/6 px-4 py-3 text-xs font-bold leading-5 text-[#7A0010]">
            The previously saved lineup no longer matches the live roster, so this page is using a fresh projection until the owner saves again.
          </div>
        ) : null}
        {editing ? (
          <div className="mb-7 rounded-xl border border-[#18BDFC]/22 bg-[#18BDFC]/8 px-4 py-2.5 text-[11px] font-bold leading-5 text-[#000B36]/65">
            <span className="font-black text-[#000B36]">Edit mode:</span> drag players by the ↕ handle to reassign or swap them, or use the dropdowns as a fallback. Drag a scratch onto a dressed slot (or a dressed player onto a scratch) to change who is dressed. Forwards stay at LW/C/RW, defensemen at LD/RD and goalies in goal; unfamiliar same-group positions still receive the AVHL 3% simulator penalty.
          </div>
        ) : (
          <div className="mb-7 rounded-xl border border-[#18BDFC]/20 bg-[#18BDFC]/8 px-4 py-2.5 text-[11px] font-bold leading-5 text-[#000B36]/60">
            {lineupSource === "saved"
              ? "This is the latest owner-saved lineup. New simulator games pull this version before the puck drops."
              : `No valid owner lineup has been saved yet, so this is automatically projected from the ${rosterSource} roster.`}
          </div>
        )}

        {displayedErrors.length ? (
          <div className="mb-8 rounded-2xl border border-[#A90117]/25 bg-[#A90117]/6 p-4" role="alert">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#A90117]">Fix before saving</p>
            <ul className="mt-2 space-y-1 text-xs font-bold text-[#7A0010]">
              {displayedErrors.slice(0, 12).map((error) => <li key={error}>• {error}</li>)}
            </ul>
          </div>
        ) : null}

        <section>
          <SectionHeading eyebrow="Even strength" title="Forward lines" copy="Four forward units. Any forward can be assigned at LW, C or RW; a non-listed slot receives the 3% sim-input penalty." />
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4].map((line) => (
              <div key={line} className="rounded-2xl border border-[#D7DFEA] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,11,54,0.035)] md:p-4">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.14em]">Line {line}</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">LW · C · RW</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {FORWARD_POSITIONS.map((position) => {
                    const index = record.forwards.findIndex((entry) => entry.line === line && entry.position === position);
                    return <div key={`${line}-${position}`}>{renderEvenSlot("forwards", index, `${position} · Line ${line}`, position, forwardRoster)}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Even strength" title="Defense pairs" copy="Three pairings. LD/RD swaps are legal; an unfamiliar side receives the 3% sim-input penalty." />
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[1, 2, 3].map((pair) => (
              <div key={pair} className="rounded-2xl border border-[#D7DFEA] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,11,54,0.035)] md:p-4">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.14em]">Pair {pair}</h3>
                  <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">LD · RD</span>
                </div>
                <div className="grid gap-2.5">
                  {DEFENSE_POSITIONS.map((position) => {
                    const index = record.defense.findIndex((entry) => entry.pair === pair && entry.position === position);
                    return <div key={`${pair}-${position}`}>{renderEvenSlot("defense", index, `${position} · Pair ${pair}`, position, defenseRoster)}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Crease" title="Goaltenders" copy="One starter and one backup are dressed. All other rostered goalies are scratched." />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[0, 1].map((index) => {
              const entry = record.goalies[index];
              const player = playerById.get(String(entry?.playerId || ""));
              const label = index === 0 ? "Starter" : "Backup";
              return editing ? (
                <div key={label}>
                  {wrapDropZone(
                    { key: `goalie-${index}`, type: "goalie", index },
                    <SelectSlot value={entry?.playerId || ""} options={goalieRoster} playerById={playerById} label={label} assignedPosition="G" team={team} onChange={(value) => updateGoalie(index, value)} dragHandleProps={dragHandleProps(entry?.playerId, { type: "goalie", index })} />,
                  )}
                </div>
              ) : (
                <PlayerCard key={label} player={player} assignedPosition="G" roleLabel={label} team={team} />
              );
            })}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Special teams" title="Power play" copy="Each unit must use 5 dressed skaters in either a 4F/1D or 3F/2D setup." />
          <div className="mt-4 space-y-3">
            {renderUnit("pp1", "PP1", [], "4F/1D or 3F/2D", { powerPlay: true })}
            {renderUnit("pp2", "PP2", [], "4F/1D or 3F/2D", { powerPlay: true })}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Special teams" title="Penalty kill" copy="Each unit uses exactly 2 forwards and 2 defensemen from the dressed lineup." />
          <div className="mt-4 space-y-3">
            {renderUnit("pk1", "PK1", ["F1", "F2", "D1", "D2"], "2F/2D")}
            {renderUnit("pk2", "PK2", ["F1", "F2", "D1", "D2"], "2F/2D")}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Extra time" title="3-on-3 overtime" copy="Two groups, each built from 2 forwards and 1 defenseman." />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {[0, 1].map((unitIndex) => {
              const ids = record.overtimeUnits[unitIndex] || [];
              return (
                <div key={unitIndex} className="rounded-2xl border border-[#D7DFEA] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,11,54,0.035)] md:p-4">
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[#000B36]/65">OT Group {unitIndex + 1}</h3>
                    <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#000B36]/28">2F · 1D</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((slotIndex) => {
                      const id = ids[slotIndex] || "";
                      const player = playerById.get(String(id));
                      const role = slotIndex < 2 ? `F${slotIndex + 1}` : "D1";
                      const options = slotIndex < 2 ? dressedForwards : dressedDefense;
                      return editing ? (
                        <div key={slotIndex}>
                          {wrapDropZone(
                            { key: `ot-${unitIndex}-${slotIndex}`, type: "ot", unitIndex, slotIndex, role },
                            <SelectSlot value={id} options={options} playerById={playerById} label={`OT ${unitIndex + 1} · ${role}`} team={team} onChange={(value) => updateOt(unitIndex, slotIndex, value)} dragHandleProps={dragHandleProps(id, { type: "ot", unitIndex, slotIndex })} />,
                          )}
                        </div>
                      ) : (
                        <PlayerCard key={slotIndex} player={player} roleLabel={role} team={team} compact />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Tiebreaker" title="Shootout order" copy="The first five shooters, in order. The simulator cycles this order if sudden death continues." />
          <div className="mt-4 rounded-2xl border border-[#D7DFEA] bg-white p-3.5 shadow-[0_2px_10px_rgba(0,11,54,0.035)] md:p-4">
            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((index) => {
                const id = record.shootoutOrder[index] || "";
                const player = playerById.get(String(id));
                return editing ? (
                  <div key={index}>
                    {wrapDropZone(
                      { key: `shootout-${index}`, type: "shootout", index },
                      <SelectSlot value={id} options={dressedSkaters} playerById={playerById} label={`Shootout ${index + 1}`} order={index + 1} team={team} onChange={(value) => updateShootout(index, value)} dragHandleProps={dragHandleProps(id, { type: "shootout", index })} />,
                    )}
                  </div>
                ) : (
                  <PlayerCard key={index} player={player} team={team} compact order={index + 1} />
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-10 md:mt-12">
          <SectionHeading eyebrow="Roster status" title="Scratches" copy="Every rostered player not among the dressed 12F, 6D and 2G appears here automatically." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scratches.length ? scratches.map((player) => {
              if (!editing) return <PlayerCard key={player.id} player={player} team={team} compact />;
              const group = groupForPlayer(player);
              return (
                <div key={player.id} className="relative">
                  {wrapDropZone(
                    { key: `scratch-${player.id}`, type: "scratch", playerId: String(player.id), group },
                    <div className="relative">
                      <PlayerCard player={player} team={team} compact />
                      <span
                        {...dragHandleProps(player.id, { type: "scratch" })}
                        draggable
                        className="absolute right-2 top-2 z-20 inline-flex cursor-grab select-none items-center gap-1 rounded-full border border-[#000B36]/10 bg-white/95 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-[#000B36]/55 shadow-sm active:cursor-grabbing"
                        title="Drag player"
                        aria-hidden="true"
                      >
                        ↕ <span className="hidden sm:inline">Drag</span>
                      </span>
                    </div>,
                  )}
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-[#000B36]/15 bg-white p-4 text-sm font-bold text-[#000B36]/40">No scratches.</div>
            )}
          </div>
        </section>

        {editing ? (
          <div className="mt-12 rounded-3xl border border-[#000B36]/10 bg-white p-5 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <p className={`text-sm font-black ${validation.ok ? "text-emerald-700" : "text-[#A90117]"}`}>{validation.ok ? "Lineup passes all AVHL constraints." : `${validation.errors.length} lineup issue${validation.errors.length === 1 ? "" : "s"} remaining.`}</p>
              <p className="mt-1 text-xs font-bold text-[#000B36]/42">Saving immediately changes the public lineup source and the lineup loaded by new simulator games.</p>
            </div>
            <div className="mt-4 flex gap-2 md:mt-0">
              <button type="button" onClick={cancelEdit} className="rounded-full border border-[#000B36]/15 px-5 py-3 text-xs font-black uppercase tracking-wide">Cancel</button>
              <button type="button" onClick={save} disabled={saving || !validation.ok} className="rounded-full bg-[#000B36] px-5 py-3 text-xs font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-35">{saving ? "Saving…" : "Save Lineup"}</button>
            </div>
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000724]/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${team.nickname} owner sign in`}>
          <form onSubmit={signIn} className="w-full max-w-md rounded-[2rem] bg-white p-6 text-[#000B36] shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A90117]">Owner access</p>
                <h2 className="mt-1.5 text-2xl font-black">{team.nickname} Owner Sign-In</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#000B36]/50">Enter the team-specific password to unlock lineup editing for this page.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2F5F9] text-lg font-black" aria-label="Close">×</button>
            </div>
            <label className="mt-5 block">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#000B36]/45">Team password</span>
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-[#000B36]/15 px-4 py-3 text-base font-bold outline-none focus:border-[#18BDFC] focus:ring-4 focus:ring-[#18BDFC]/10"
                autoFocus
              />
            </label>
            {authError ? <p className="mt-3 text-xs font-black text-[#A90117]">{authError}</p> : null}
            <button type="submit" disabled={authenticating || !passwordInput} className="mt-5 w-full rounded-2xl bg-[#000B36] px-5 py-3.5 text-sm font-black uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-45">{authenticating ? "Signing In…" : "Sign In & Edit Lineup"}</button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
